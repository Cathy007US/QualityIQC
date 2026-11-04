from __future__ import annotations

import hashlib
import re
import uuid
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    AuditLog,
    Category,
    Document,
    DocumentAsset,
    DocumentVersion,
    User,
)
from app.schemas import (
    DOC_TYPE_LABELS,
    DOC_TYPE_LABELS_EN,
    CategoryOut,
    DocumentDetail,
    DocumentSummary,
)
from app.services.parser import (
    ALLOWED_EXTENSIONS,
    DocumentParseError,
    ParsedDocument,
    parse_document,
)


class UploadError(ValueError):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def ensure_upload_dir() -> Path:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    return settings.upload_dir


def safe_file_path(stored_name: str) -> Path:
    base = ensure_upload_dir().resolve()
    candidate = (base / Path(stored_name).name).resolve()
    if base != candidate.parent:
        raise FileNotFoundError("非法文件路径")
    return candidate


def ensure_assets_dir() -> Path:
    path = ensure_upload_dir() / "assets"
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_asset_path(stored_name: str) -> Path:
    base = ensure_assets_dir().resolve()
    candidate = (base / Path(stored_name).name).resolve()
    if base != candidate.parent:
        raise FileNotFoundError("非法图片路径")
    return candidate


def remove_asset_file(stored_name: str) -> None:
    try:
        path = safe_asset_path(stored_name)
        if path.exists():
            path.unlink()
    except OSError:
        pass


def persist_assets(
    db: Session,
    document: Document,
    parsed: ParsedDocument,
) -> tuple[dict[str, int], list[DocumentAsset]]:
    """Write extracted images to the uploads volume and create asset rows."""
    mapping: dict[str, int] = {}
    rows: list[DocumentAsset] = []
    if not parsed.assets:
        return mapping, rows

    base = ensure_assets_dir()
    try:
        for index, asset in enumerate(parsed.assets):
            stored_name = f"{uuid.uuid4().hex}{asset.ext}"
            (base / stored_name).write_bytes(asset.data)
            row = DocumentAsset(
                document_id=document.id,
                stored_name=stored_name,
                source_name=(asset.source_name or "")[:255] or None,
                mime_type=asset.mime_type,
                file_size=len(asset.data),
                width=asset.width,
                height=asset.height,
                sort_order=index,
            )
            db.add(row)
            db.flush()
            rows.append(row)
            mapping[asset.key] = row.id
    except Exception:
        cleanup_asset_rows(rows)
        raise
    return mapping, rows


def bind_asset_ids(
    blocks: list[dict],
    asset_ids: dict[str, int],
) -> list[dict]:
    bound: list[dict] = []
    for block in blocks:
        if block.get("type") != "image":
            bound.append(dict(block))
            continue
        asset_id = asset_ids.get(str(block.get("asset_key", "")))
        if asset_id is None:
            continue
        item = dict(block)
        item["asset_id"] = asset_id
        item.pop("asset_key", None)
        bound.append(item)
    return bound


def cleanup_asset_rows(rows: list[DocumentAsset]) -> None:
    for row in rows:
        remove_asset_file(row.stored_name)


def calculate_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


async def save_upload_to_temp(upload: UploadFile, tmp_path: Path) -> int:
    total = 0
    limit = settings.max_upload_bytes
    with tmp_path.open("wb") as fh:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > limit:
                raise UploadError(f"文件超过 {settings.max_upload_mb}MB 上限", status_code=413)
            fh.write(chunk)
    if total == 0:
        raise UploadError("上传的文件为空")
    return total


def validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadError("仅支持 .docx、.xlsx、.pdf 格式")
    return ext


def clean_filename(filename: str) -> str:
    name = Path(filename).name.replace("\x00", "").strip()
    name = re.sub(r"[\r\n]", "", name)
    if not name:
        return "document"
    if len(name) > 200:
        stem = Path(name).stem[:150]
        name = f"{stem}{Path(name).suffix}"
    return name


def store_file(tmp_path: Path, ext: str) -> str:
    stored_name = f"{uuid.uuid4().hex}{ext}"
    target = ensure_upload_dir() / stored_name
    tmp_path.replace(target)
    return stored_name


def remove_stored_file(stored_name: str) -> None:
    try:
        path = safe_file_path(stored_name)
        if path.exists():
            path.unlink()
    except OSError:
        pass


def parse_upload(tmp_path: Path, ext: str) -> ParsedDocument:
    try:
        return parse_document(tmp_path, ext)
    except DocumentParseError as exc:
        raise UploadError(str(exc), status_code=422) from exc


def generate_document_no(db: Session) -> str:
    year = datetime.now(UTC).year
    for _ in range(5):
        candidate = f"IQC-{year}-{uuid.uuid4().hex[:6].upper()}"
        exists = db.scalar(select(Document.id).where(Document.document_no == candidate))
        if not exists:
            return candidate
    return f"IQC-{year}-{uuid.uuid4().hex[:10].upper()}"


def check_duplicate(db: Session, sha256: str, exclude_id: int | None = None) -> None:
    query = select(Document.id).where(Document.sha256 == sha256, Document.is_deleted.is_(False))
    if exclude_id is not None:
        query = query.where(Document.id != exclude_id)
    existing = db.scalar(query)
    if existing:
        raise UploadError(f"该文件内容已存在（文档 ID {existing}），请勿重复上传", status_code=409)


def _english_translation(category: Category) -> Any | None:
    return next((row for row in category.translations if row.locale == "en-US"), None)


def to_category_out(category: Category, count: int = 0, locale: str = "zh-CN") -> CategoryOut:
    english = _english_translation(category)
    name = english.name if locale == "en-US" and english else category.name
    description = (
        english.description if locale == "en-US" and english else category.description
    )
    return CategoryOut(
        id=category.id,
        name=name,
        name_zh=category.name,
        name_en=english.name if english else None,
        slug=category.slug,
        description=description,
        description_zh=category.description,
        description_en=english.description if english else None,
        color=category.color,
        sort_order=category.sort_order,
        document_count=count,
    )


def to_summary(document: Document, locale: str = "zh-CN") -> DocumentSummary:
    category = document.category
    category_out = (
        to_category_out(category, locale=locale)
        if category is not None
        else CategoryOut(
            id=0,
            name="Uncategorized" if locale == "en-US" else "未分类",
            name_zh="未分类",
            name_en="Uncategorized",
            slug="uncategorized",
            description=None,
            description_zh=None,
            description_en=None,
            color="slate",
            sort_order=999,
        )
    )
    return DocumentSummary(
        id=document.id,
        document_no=document.document_no,
        locale=document.locale,
        title=document.title,
        category=category_out,
        doc_type=document.doc_type,
        doc_type_label=(
            DOC_TYPE_LABELS_EN if locale == "en-US" else DOC_TYPE_LABELS
        ).get(document.doc_type, "Other" if locale == "en-US" else "其他"),
        product_line=document.product_line,
        supplier=document.supplier,
        revision=document.revision,
        summary=document.summary,
        tags=document.tags or [],
        status=document.status,
        effective_date=document.effective_date,
        expiry_date=document.expiry_date,
        file_name=document.file_name,
        file_ext=document.file_ext,
        file_size=document.file_size,
        mime_type=document.mime_type,
        version=document.version,
        download_count=document.download_count,
        uploaded_by=document.uploaded_by.display_name if document.uploaded_by else None,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


def to_detail(document: Document, locale: str = "zh-CN") -> DocumentDetail:
    summary = to_summary(document, locale)
    blocks: list[dict] = []
    for block in document.content_json.get("blocks", []) if document.content_json else []:
        item = dict(block)
        if item.get("type") == "image" and item.get("asset_id"):
            item["url"] = (
                f"{settings.api_prefix}/documents/{document.id}/assets/{item['asset_id']}"
            )
        blocks.append(item)
    return DocumentDetail(
        **summary.model_dump(),
        content_blocks=blocks,
        content_meta=document.content_meta or {},
        previous_versions=max(document.version - 1, 0),
    )


def audit(
    db: Session,
    user: User | None,
    action: str,
    target_type: str = "document",
    target_id: int | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else None,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail[:2000] if detail else None,
            ip_address=ip_address,
        )
    )


def snapshot_version(
    db: Session,
    document: Document,
    user: User | None,
    change_note: str | None = None,
) -> DocumentVersion:
    version = DocumentVersion(
        document_id=document.id,
        version=document.version,
        revision=document.revision,
        file_name=document.file_name,
        stored_name=document.stored_name,
        file_size=document.file_size,
        sha256=document.sha256,
        content_text=document.content_text,
        content_json=document.content_json,
        change_note=change_note,
        uploaded_by_id=user.id if user else None,
    )
    db.add(version)
    return version


def parse_optional_date(value: str | None, field_name: str) -> date | None:
    if value is None or not value.strip():
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError as exc:
        raise UploadError(f"{field_name}格式应为 YYYY-MM-DD") from exc


def parse_tags(raw: str | None) -> list[str]:
    if not raw:
        return []
    tags: list[str] = []
    for item in re.split(r"[,，;；\n]", raw):
        tag = item.strip()[:64]
        if tag and tag not in tags:
            tags.append(tag)
    return tags[:12]
