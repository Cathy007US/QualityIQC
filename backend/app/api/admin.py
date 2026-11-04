from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload
from starlette.concurrency import run_in_threadpool

from app.deps import AdminUser, DbSession
from app.locale import normalize_locale
from app.models import (
    Category,
    CategoryTranslation,
    Document,
    DocumentAsset,
    DocumentVersion,
)
from app.schemas import (
    DOC_TYPE_LABELS,
    AdminOverview,
    CategoryCreate,
    CategoryOut,
    CategoryStat,
    CategoryUpdate,
    DocumentDetail,
    DocumentSummary,
    DocumentUpdate,
    DocumentVersionOut,
    MessageOut,
    Page,
)
from app.security import get_client_ip
from app.services.documents import (
    UploadError,
    audit,
    bind_asset_ids,
    calculate_sha256,
    check_duplicate,
    clean_filename,
    cleanup_asset_rows,
    ensure_upload_dir,
    generate_document_no,
    parse_optional_date,
    parse_tags,
    parse_upload,
    persist_assets,
    remove_stored_file,
    safe_file_path,
    save_upload_to_temp,
    snapshot_version,
    store_file,
    to_category_out,
    to_detail,
    to_summary,
    validate_extension,
)

router = APIRouter(prefix="/admin", tags=["管理端"])

AllowedColor = Literal["teal", "blue", "amber", "violet", "rose", "cyan", "emerald", "indigo", "orange", "slate"]
ALLOWED_COLORS = {"teal", "blue", "amber", "violet", "rose", "cyan", "emerald", "indigo", "orange", "slate"}
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _get_document(db: Session, document_id: int) -> Document:
    document = db.scalar(
        select(Document)
        .options(joinedload(Document.category), selectinload(Document.uploaded_by))
        .where(Document.id == document_id, Document.is_deleted.is_(False))
    )
    if document is None:
        raise HTTPException(status_code=404, detail="文档不存在")
    return document


def _get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=422, detail="所选分类不存在")
    return category


def _validate_doc_type(doc_type: str) -> str:
    if doc_type not in DOC_TYPE_LABELS:
        raise HTTPException(status_code=422, detail="文档类型不合法")
    return doc_type


def _normalize_tags(tags: list[str] | None) -> list[str]:
    result: list[str] = []
    for item in tags or []:
        tag = str(item).strip()[:64]
        if tag and tag not in result:
            result.append(tag)
    return result[:12]


def _make_slug(name: str, requested: str | None) -> str:
    if requested and requested.strip():
        slug = requested.strip().lower()
    else:
        slug = f"cat-{uuid.uuid4().hex[:8]}"
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(status_code=422, detail="分类标识只能包含小写字母、数字和连字符")
    return slug


def _validate_color(color: str) -> str:
    if color not in ALLOWED_COLORS:
        raise HTTPException(status_code=422, detail="分类颜色不合法")
    return color


def _english_category_translation(category: Category) -> CategoryTranslation | None:
    return next((row for row in category.translations if row.locale == "en-US"), None)


def _save_english_category(
    db: DbSession,
    category: Category,
    name_en: str | None,
    description_en: str | None,
) -> None:
    english = _english_category_translation(category)
    name = (name_en or "").strip()
    description = (description_en or "").strip() or None
    if not name:
        if english is not None:
            category.translations.remove(english)
            db.delete(english)
        return
    if english is None:
        english = CategoryTranslation(
            category_id=category.id,
            locale="en-US",
            name=name,
            description=description,
        )
        db.add(english)
        category.translations.append(english)
    else:
        english.name = name
        english.description = description


@router.get("/overview", response_model=AdminOverview, summary="管理端概览")
def overview(user: AdminUser, db: DbSession) -> AdminOverview:
    conditions = [Document.is_deleted.is_(False)]
    document_count = db.scalar(select(func.count(Document.id)).where(*conditions)) or 0
    category_count = db.scalar(select(func.count(Category.id))) or 0
    download_count = db.scalar(
        select(func.coalesce(func.sum(Document.download_count), 0)).where(*conditions)
    ) or 0
    storage_bytes = db.scalar(
        select(func.coalesce(func.sum(Document.file_size), 0)).where(*conditions)
    ) or 0
    archived_count = db.scalar(
        select(func.count(Document.id)).where(
            Document.is_deleted.is_(False), Document.status == "archived"
        )
    ) or 0
    cutoff = datetime.now(UTC) - timedelta(days=30)
    uploads_last_30d = db.scalar(
        select(func.count(Document.id)).where(
            Document.is_deleted.is_(False), Document.created_at >= cutoff
        )
    ) or 0
    locale_rows = db.execute(
        select(Document.locale, func.count(Document.id))
        .where(Document.is_deleted.is_(False))
        .group_by(Document.locale)
    ).all()
    locale_counts = {locale: count for locale, count in locale_rows}

    recent = db.scalars(
        select(Document)
        .options(joinedload(Document.category), selectinload(Document.uploaded_by))
        .where(*conditions)
        .order_by(Document.updated_at.desc())
        .limit(5)
    ).all()

    category_rows = db.execute(
        select(Category, func.count(Document.id))
        .outerjoin(
            Document,
            and_(Document.category_id == Category.id, Document.is_deleted.is_(False)),
        )
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.id)
    ).all()

    return AdminOverview(
        document_count=document_count,
        category_count=category_count,
        download_count=int(download_count),
        storage_bytes=int(storage_bytes),
        archived_count=archived_count,
        uploads_last_30d=uploads_last_30d,
        locale_counts=locale_counts,
        recent_documents=[to_summary(item, item.locale) for item in recent],
        category_stats=[
            CategoryStat(
                id=category.id,
                name=category.name,
                slug=category.slug,
                color=category.color,
                count=count,
            )
            for category, count in category_rows
        ],
    )


@router.get("/documents", response_model=Page[DocumentSummary], summary="管理端文档列表")
def admin_list_documents(
    user: AdminUser,
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    lang: Annotated[str | None, Query(max_length=20)] = None,
    category: Annotated[str | None, Query(max_length=80)] = None,
    doc_type: Annotated[str | None, Query(max_length=40)] = None,
    status_filter: Annotated[Literal["published", "archived"] | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Page[DocumentSummary]:
    conditions = [Document.is_deleted.is_(False)]
    if lang:
        conditions.append(Document.locale == normalize_locale(lang))
    if category:
        conditions.append(Category.slug == category)
    if doc_type:
        conditions.append(Document.doc_type == doc_type)
    if status_filter:
        conditions.append(Document.status == status_filter)
    if q:
        terms = [part for part in q.strip().split() if part][:8]
        haystack = func.concat_ws(
            " ",
            Document.title,
            Document.document_no,
            func.coalesce(Document.summary, ""),
            func.coalesce(Document.content_text, ""),
            Category.name,
            func.array_to_string(Document.tags, " "),
        )
        for term in terms:
            escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            conditions.append(haystack.ilike(f"%{escaped}%", escape="\\"))

    total = db.scalar(
        select(func.count(Document.id)).select_from(Document).join(Category).where(*conditions)
    ) or 0
    documents = db.scalars(
        select(Document)
        .join(Category)
        .options(joinedload(Document.category), selectinload(Document.uploaded_by))
        .where(*conditions)
        .order_by(Document.updated_at.desc(), Document.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    pages = (total + page_size - 1) // page_size if total else 0
    return Page(
        items=[to_summary(document, document.locale) for document in documents],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post(
    "/documents",
    response_model=DocumentDetail,
    status_code=status.HTTP_201_CREATED,
    summary="上传文档",
)
async def upload_document(
    request: Request,
    user: AdminUser,
    db: DbSession,
    file: Annotated[UploadFile, File(...)],
    title: Annotated[str, Form(...)],
    category_id: Annotated[int, Form(...)],
    doc_type: Annotated[str, Form(...)],
    locale: Annotated[str, Form()] = "zh-CN",
    document_no: Annotated[str | None, Form()] = None,
    revision: Annotated[str, Form()] = "A0",
    summary: Annotated[str | None, Form()] = None,
    product_line: Annotated[str | None, Form()] = None,
    supplier: Annotated[str | None, Form()] = None,
    tags: Annotated[str | None, Form()] = None,
    effective_date: Annotated[str | None, Form()] = None,
    expiry_date: Annotated[str | None, Form()] = None,
) -> DocumentDetail:
    ensure_upload_dir()
    ext = validate_extension(file.filename or "")
    clean_title = (title or "").strip()
    if not clean_title:
        raise HTTPException(status_code=422, detail="文档标题不能为空")
    if len(clean_title) > 240:
        raise HTTPException(status_code=422, detail="文档标题不能超过 240 个字符")
    _validate_doc_type(doc_type)
    selected_locale = normalize_locale(locale)
    _get_category(db, category_id)
    parsed_effective = parse_optional_date(effective_date, "生效日期")
    parsed_expiry = parse_optional_date(expiry_date, "失效日期")
    if parsed_effective and parsed_expiry and parsed_expiry < parsed_effective:
        raise HTTPException(status_code=422, detail="失效日期不能早于生效日期")

    normalized_doc_no = (document_no or "").strip()
    if normalized_doc_no:
        if len(normalized_doc_no) > 64:
            raise HTTPException(status_code=422, detail="文档编号不能超过 64 个字符")
        if db.scalar(
            select(Document.id).where(
                Document.document_no == normalized_doc_no,
                Document.locale == selected_locale,
            )
        ):
            raise HTTPException(status_code=409, detail="该语言下的文档编号已存在")
    else:
        normalized_doc_no = generate_document_no(db)

    tmp_path = ensure_upload_dir() / f".upload-{uuid.uuid4().hex}{ext}"
    stored_name: str | None = None
    asset_rows: list[DocumentAsset] = []
    committed = False
    try:
        size = await save_upload_to_temp(file, tmp_path)
        parsed = await run_in_threadpool(parse_upload, tmp_path, ext)
        sha256 = await run_in_threadpool(calculate_sha256, tmp_path)
        check_duplicate(db, sha256)

        stored_name = await run_in_threadpool(store_file, tmp_path, ext)
        document = Document(
            document_no=normalized_doc_no,
            locale=selected_locale,
            title=clean_title,
            category_id=category_id,
            doc_type=doc_type,
            product_line=(product_line or "").strip() or None,
            supplier=(supplier or "").strip() or None,
            revision=(revision or "A0").strip() or "A0",
            summary=(summary or "").strip() or parsed.summary,
            tags=parse_tags(tags),
            status="published",
            effective_date=parsed_effective,
            expiry_date=parsed_expiry,
            file_name=clean_filename(file.filename or f"document{ext}"),
            stored_name=stored_name,
            file_ext=ext,
            file_size=size,
            mime_type=file.content_type or "application/octet-stream",
            sha256=sha256,
            content_text=parsed.text,
            content_json={"blocks": []},
            content_meta=parsed.meta,
            version=1,
            uploaded_by_id=user.id,
        )
        db.add(document)
        db.flush()
        asset_ids, asset_rows = persist_assets(db, document, parsed)
        document.content_json = {"blocks": bind_asset_ids(parsed.blocks, asset_ids)}
        snapshot_version(db, document, user, "初始版本")
        audit(
            db,
            user,
            action="upload",
            target_id=document.id,
            detail=f"[{document.locale}] {document.document_no} {document.title}",
            ip_address=get_client_ip(request),
        )
        db.commit()
        committed = True
        return to_detail(document)
    except UploadError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="文档编号或数据冲突，请重试") from exc
    finally:
        if not committed:
            cleanup_asset_rows(asset_rows)
            if stored_name:
                remove_stored_file(stored_name)
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        await file.close()


@router.patch("/documents/{document_id}", response_model=DocumentDetail, summary="更新文档信息")
def update_document(
    document_id: int,
    payload: DocumentUpdate,
    request: Request,
    user: AdminUser,
    db: DbSession,
) -> DocumentDetail:
    document = _get_document(db, document_id)
    changes = payload.model_dump(exclude_unset=True)

    for required_field in ("title", "category_id", "doc_type", "revision", "status"):
        if required_field in changes and changes[required_field] is None:
            raise HTTPException(status_code=422, detail=f"{required_field} 不能为空")

    if "title" in changes:
        title = str(changes["title"]).strip()
        if not title:
            raise HTTPException(status_code=422, detail="文档标题不能为空")
        document.title = title[:240]
    if "category_id" in changes:
        _get_category(db, int(changes["category_id"]))
        document.category_id = int(changes["category_id"])
    if "doc_type" in changes:
        document.doc_type = _validate_doc_type(str(changes["doc_type"]))
    if "revision" in changes:
        document.revision = str(changes["revision"]).strip()[:32] or "A0"
    if "summary" in changes:
        document.summary = (changes["summary"] or "").strip() or None
    if "product_line" in changes:
        document.product_line = (changes["product_line"] or "").strip()[:120] or None
    if "supplier" in changes:
        document.supplier = (changes["supplier"] or "").strip()[:160] or None
    if "tags" in changes:
        document.tags = _normalize_tags(changes["tags"])
    if "status" in changes:
        document.status = str(changes["status"])
    if "effective_date" in changes:
        document.effective_date = changes["effective_date"]
    if "expiry_date" in changes:
        document.expiry_date = changes["expiry_date"]
    if document.effective_date and document.expiry_date and document.expiry_date < document.effective_date:
        raise HTTPException(status_code=422, detail="失效日期不能早于生效日期")

    audit(
        db,
        user,
        action="update",
        target_id=document.id,
        detail=", ".join(sorted(changes.keys())),
        ip_address=get_client_ip(request),
    )
    db.commit()
    return to_detail(document)


@router.post(
    "/documents/{document_id}/replace",
    response_model=DocumentDetail,
    summary="替换文档文件并生成新版本",
)
async def replace_document_file(
    document_id: int,
    request: Request,
    user: AdminUser,
    db: DbSession,
    file: Annotated[UploadFile, File(...)],
    revision: Annotated[str | None, Form()] = None,
    change_note: Annotated[str | None, Form()] = None,
) -> DocumentDetail:
    document = _get_document(db, document_id)
    old_assets = list(document.assets)
    ext = validate_extension(file.filename or "")
    tmp_path = ensure_upload_dir() / f".upload-{uuid.uuid4().hex}{ext}"
    stored_name: str | None = None
    asset_rows: list[DocumentAsset] = []
    committed = False
    try:
        size = await save_upload_to_temp(file, tmp_path)
        parsed = await run_in_threadpool(parse_upload, tmp_path, ext)
        sha256 = await run_in_threadpool(calculate_sha256, tmp_path)
        if sha256 == document.sha256:
            raise UploadError("新文件内容与当前版本完全相同", status_code=409)
        check_duplicate(db, sha256, exclude_id=document.id)

        stored_name = await run_in_threadpool(store_file, tmp_path, ext)
        document.file_name = clean_filename(file.filename or f"document{ext}")
        document.stored_name = stored_name
        document.file_ext = ext
        document.file_size = size
        document.mime_type = file.content_type or "application/octet-stream"
        document.sha256 = sha256
        document.content_text = parsed.text
        document.content_json = {"blocks": []}
        document.content_meta = parsed.meta
        document.version += 1
        if revision and revision.strip():
            document.revision = revision.strip()[:32]
        if not document.summary and parsed.summary:
            document.summary = parsed.summary
        document.updated_at = datetime.now(UTC)
        asset_ids, asset_rows = persist_assets(db, document, parsed)
        document.content_json = {"blocks": bind_asset_ids(parsed.blocks, asset_ids)}
        if old_assets:
            db.query(DocumentAsset).filter(
                DocumentAsset.id.in_([asset.id for asset in old_assets])
            ).delete(synchronize_session=False)
        snapshot_version(db, document, user, (change_note or "").strip() or None)
        audit(
            db,
            user,
            action="replace",
            target_id=document.id,
            detail=f"v{document.version} {document.file_name}",
            ip_address=get_client_ip(request),
        )
        db.commit()
        committed = True
        cleanup_asset_rows(old_assets)
        return to_detail(document)
    except UploadError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="版本数据冲突，请重试") from exc
    finally:
        if not committed:
            cleanup_asset_rows(asset_rows)
            if stored_name:
                remove_stored_file(stored_name)
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        await file.close()


@router.delete("/documents/{document_id}", response_model=MessageOut, summary="下架并删除文档")
def delete_document(
    document_id: int,
    request: Request,
    user: AdminUser,
    db: DbSession,
) -> MessageOut:
    document = _get_document(db, document_id)
    document.is_deleted = True
    document.status = "archived"
    document.updated_at = datetime.now(UTC)
    audit(
        db,
        user,
        action="delete",
        target_id=document.id,
        detail=f"{document.document_no} {document.title}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return MessageOut(message="文档已删除")


@router.get(
    "/documents/{document_id}/versions",
    response_model=list[DocumentVersionOut],
    summary="版本历史",
)
def list_versions(document_id: int, user: AdminUser, db: DbSession) -> list[DocumentVersionOut]:
    _get_document(db, document_id)
    versions = db.scalars(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version.desc())
    ).all()
    return [DocumentVersionOut.model_validate(version) for version in versions]


@router.get(
    "/documents/{document_id}/versions/{version_id}/download",
    summary="下载历史版本",
)
def download_version(
    document_id: int,
    version_id: int,
    user: AdminUser,
    db: DbSession,
) -> FileResponse:
    _get_document(db, document_id)
    version = db.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document_id,
        )
    )
    if version is None:
        raise HTTPException(status_code=404, detail="版本不存在")
    try:
        path = safe_file_path(version.stored_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="历史文件不存在") from None
    if not path.exists():
        raise HTTPException(status_code=404, detail="历史文件不存在")
    filename = f"v{version.version}-{version.file_name}"
    disposition = f"attachment; filename=\"version-{version.version}\"; filename*=UTF-8''{quote(filename)}"
    return FileResponse(
        path=path,
        media_type="application/octet-stream",
        headers={"Content-Disposition": disposition},
    )


@router.get("/categories", response_model=list[CategoryOut], summary="全部分类")
def admin_categories(user: AdminUser, db: DbSession) -> list[CategoryOut]:
    rows = db.execute(
        select(Category, func.count(Document.id))
        .outerjoin(
            Document,
            and_(Document.category_id == Category.id, Document.is_deleted.is_(False)),
        )
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.id)
    ).all()
    return [to_category_out(category, count) for category, count in rows]


@router.post(
    "/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="新建分类",
)
def create_category(
    payload: CategoryCreate,
    request: Request,
    user: AdminUser,
    db: DbSession,
) -> CategoryOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="分类名称不能为空")
    slug = _make_slug(name, payload.slug)
    color = _validate_color(payload.color)
    existing = db.scalar(
        select(Category).where(or_(Category.name == name, Category.slug == slug))
    )
    if existing:
        raise HTTPException(status_code=409, detail="分类名称或标识已存在")

    category = Category(
        name=name,
        slug=slug,
        description=(payload.description or "").strip() or None,
        color=color,
        sort_order=payload.sort_order,
    )
    db.add(category)
    db.flush()
    _save_english_category(db, category, payload.name_en, payload.description_en)
    audit(
        db,
        user,
        action="create_category",
        target_type="category",
        target_id=category.id,
        detail=category.name,
        ip_address=get_client_ip(request),
    )
    db.commit()
    return to_category_out(category, 0)


@router.patch("/categories/{category_id}", response_model=CategoryOut, summary="更新分类")
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    request: Request,
    user: AdminUser,
    db: DbSession,
) -> CategoryOut:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="分类不存在")
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="分类名称不能为空")
        duplicate = db.scalar(
            select(Category).where(Category.name == name, Category.id != category_id)
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="分类名称已存在")
        category.name = name
    if "slug" in changes:
        slug = _make_slug(category.name, changes["slug"])
        duplicate = db.scalar(
            select(Category).where(Category.slug == slug, Category.id != category_id)
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="分类标识已存在")
        category.slug = slug
    if "description" in changes:
        category.description = (changes["description"] or "").strip() or None
    if "name_en" in changes or "description_en" in changes:
        current_en = _english_category_translation(category)
        name_en = changes.get("name_en", current_en.name if current_en else None)
        description_en = changes.get(
            "description_en", current_en.description if current_en else None
        )
        _save_english_category(db, category, name_en, description_en)
    if "color" in changes and changes["color"] is not None:
        category.color = _validate_color(str(changes["color"]))
    if "sort_order" in changes and changes["sort_order"] is not None:
        category.sort_order = int(changes["sort_order"])
    audit(
        db,
        user,
        action="update_category",
        target_type="category",
        target_id=category.id,
        detail=", ".join(sorted(changes.keys())),
        ip_address=get_client_ip(request),
    )
    db.commit()
    count = db.scalar(
        select(func.count(Document.id)).where(
            Document.category_id == category.id, Document.is_deleted.is_(False)
        )
    ) or 0
    return to_category_out(category, count)


@router.delete("/categories/{category_id}", response_model=MessageOut, summary="删除分类")
def delete_category(
    category_id: int,
    request: Request,
    user: AdminUser,
    db: DbSession,
) -> MessageOut:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="分类不存在")
    count = db.scalar(
        select(func.count(Document.id)).where(
            Document.category_id == category_id,
            Document.is_deleted.is_(False),
        )
    ) or 0
    if count:
        raise HTTPException(status_code=409, detail=f"该分类下还有 {count} 个文档，无法删除")
    audit(
        db,
        user,
        action="delete_category",
        target_type="category",
        target_id=category.id,
        detail=category.name,
        ip_address=get_client_ip(request),
    )
    db.delete(category)
    db.commit()
    return MessageOut(message="分类已删除")
