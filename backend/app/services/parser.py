from __future__ import annotations

import hashlib
import re
import zipfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document as open_docx
from docx.document import Document as DocxDocument
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from openpyxl import load_workbook
from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader

ALLOWED_EXTENSIONS = {".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      ".pdf": "application/pdf"}

MAX_TEXT_CHARS = 1_000_000
MAX_BLOCK_CHARS = 1_500_000
MAX_TABLE_ROWS = 500
MAX_TABLE_COLS = 40
MAX_PDF_PAGES = 400
MAX_ZIP_UNCOMPRESSED = 250 * 1024 * 1024
MAX_ZIP_ENTRIES = 5000
MAX_IMAGES = 80
MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_TOTAL_IMAGE_BYTES = 64 * 1024 * 1024

A_BLIP = "{http://schemas.openxmlformats.org/drawingml/2006/main}blip"
R_EMBED = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
R_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
VML_IMAGEDATA = "{urn:schemas-microsoft-com:vml}imagedata"

DIRECT_IMAGE_TYPES = {
    "png": ("image/png", ".png"),
    "jpeg": ("image/jpeg", ".jpg"),
    "jpg": ("image/jpeg", ".jpg"),
    "gif": ("image/gif", ".gif"),
    "webp": ("image/webp", ".webp"),
}


class DocumentParseError(ValueError):
    """Raised when an uploaded file cannot be converted into readable content."""


@dataclass
class ParsedAsset:
    key: str
    data: bytes
    mime_type: str
    ext: str
    width: int | None
    height: int | None
    source_name: str | None = None


@dataclass
class ParsedDocument:
    blocks: list[dict[str, Any]]
    text: str
    meta: dict[str, Any] = field(default_factory=dict)
    summary: str | None = None
    assets: list[ParsedAsset] = field(default_factory=list)


def parse_document(path: Path, ext: str) -> ParsedDocument:
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise DocumentParseError("仅支持 .docx、.xlsx、.pdf 格式")
    _validate_signature(path, ext)
    if ext in {".docx", ".xlsx"}:
        _validate_zip(path)

    if ext == ".docx":
        parsed = _parse_docx(path)
    elif ext == ".xlsx":
        parsed = _parse_xlsx(path)
    else:
        parsed = _parse_pdf(path)

    if not parsed.blocks:
        raise DocumentParseError("未能从文件中提取到内容，请检查文件是否为空或已损坏")

    parsed.text = _blocks_to_text(parsed.blocks)
    if len(parsed.text) > MAX_TEXT_CHARS:
        parsed.text = parsed.text[:MAX_TEXT_CHARS] + "\n\n[内容过长，检索文本已截断]"
        parsed.meta["text_truncated"] = True
    if not parsed.summary:
        parsed.summary = _build_summary(parsed.blocks)
    parsed.meta["char_count"] = len(parsed.text)
    return parsed


def _validate_signature(path: Path, ext: str) -> None:
    with path.open("rb") as fh:
        head = fh.read(8)
    if ext == ".pdf":
        if not head.startswith(b"%PDF"):
            raise DocumentParseError("文件内容不是有效的 PDF")
    elif not head.startswith(b"PK\x03\x04"):
        raise DocumentParseError("文件内容不是有效的 Office 文档")


def _validate_zip(path: Path) -> None:
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_ZIP_ENTRIES:
                raise DocumentParseError("文档内部文件数量异常，已拒绝解析")
            total = sum(info.file_size for info in infos)
            if total > MAX_ZIP_UNCOMPRESSED:
                raise DocumentParseError("文档解压后体积过大，已拒绝解析")
    except zipfile.BadZipFile as exc:
        raise DocumentParseError("Office 文档结构损坏，无法解析") from exc


# ---------------------------------------------------------------------------
# DOCX
# ---------------------------------------------------------------------------


def _parse_docx(path: Path) -> ParsedDocument:
    try:
        document = open_docx(str(path))
    except Exception as exc:  # python-docx raises various low-level errors
        raise DocumentParseError("Word 文档解析失败，请确认文件未加密且格式正确") from exc

    blocks: list[dict[str, Any]] = []
    assets: list[ParsedAsset] = []
    asset_cache: dict[str, ParsedAsset | None] = {}
    skipped_images = [0]
    table_count = 0
    truncated = False

    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            paragraph = Paragraph(child, document)
            block = _docx_paragraph_block(paragraph)
            if block:
                blocks.append(block)
            blocks.extend(
                _docx_images_from_element(child, document, assets, asset_cache, skipped_images)
            )
        elif child.tag == qn("w:tbl"):
            table = Table(child, document)
            block, was_truncated = _docx_table_block(table)
            table_count += 1
            truncated = truncated or was_truncated
            if block:
                blocks.append(block)
            blocks.extend(
                _docx_images_from_element(child, document, assets, asset_cache, skipped_images)
            )

    meta = {
        "format": "docx",
        "paragraph_count": len([b for b in blocks if b["type"] in {"paragraph", "heading", "list_item"}]),
        "table_count": table_count,
        "sheet_count": 0,
        "page_count": 0,
        "image_count": len(assets),
        "image_skipped": skipped_images[0],
        "truncated": truncated,
    }
    return ParsedDocument(blocks=_limit_blocks(blocks), text="", meta=meta, assets=assets)


def _docx_images_from_element(
    element: Any,
    document: DocxDocument,
    assets: list[ParsedAsset],
    cache: dict[str, ParsedAsset | None],
    skipped: list[int],
) -> list[dict[str, Any]]:
    """Extract inline/floating images while keeping their position in the body."""
    image_blocks: list[dict[str, Any]] = []
    for node in element.iter():
        if node.tag == A_BLIP:
            relationship_id = node.get(R_EMBED)
        elif node.tag == VML_IMAGEDATA:
            relationship_id = node.get(R_ID)
        else:
            continue
        if not relationship_id:
            continue

        part = document.part.related_parts.get(relationship_id)
        if part is None or not str(getattr(part, "content_type", "")).startswith("image/"):
            continue

        part_name = str(part.partname)
        if part_name in cache:
            asset = cache[part_name]
            if asset is None:
                continue
        else:
            total_bytes = sum(len(item.data) for item in assets)
            if len(assets) >= MAX_IMAGES:
                skipped[0] += 1
                cache[part_name] = None
                continue
            try:
                raw = part.blob
            except Exception:  # noqa: BLE001 - a damaged image must not fail the document
                skipped[0] += 1
                cache[part_name] = None
                continue
            if len(raw) > MAX_IMAGE_BYTES or total_bytes + len(raw) > MAX_TOTAL_IMAGE_BYTES:
                skipped[0] += 1
                cache[part_name] = None
                continue
            asset = _prepare_asset(
                raw,
                key=f"img-{len(assets) + 1}",
                source_name=Path(part_name).name,
            )
            if asset is None:
                skipped[0] += 1
                cache[part_name] = None
                continue
            assets.append(asset)
            cache[part_name] = asset

        image_blocks.append(
            {
                "type": "image",
                "asset_key": asset.key,
                "alt": "文档内嵌图片",
                "width": asset.width,
                "height": asset.height,
            }
        )
    return image_blocks


def _docx_paragraph_block(paragraph: Paragraph) -> dict[str, Any] | None:
    text = _clean_text(paragraph.text)
    if not text:
        return None

    style_name = ""
    try:
        style_name = (paragraph.style.name or "").strip()
    except (AttributeError, KeyError):
        pass

    lowered = style_name.lower()
    heading_match = re.search(r"(?:heading|标题)\s*(\d+)", lowered)
    if heading_match:
        level = min(max(int(heading_match.group(1)), 1), 6)
        return {"type": "heading", "level": level, "text": text}
    if lowered in {"title", "标题"}:
        return {"type": "heading", "level": 1, "text": text}
    if lowered in {"subtitle", "副标题"}:
        return {"type": "heading", "level": 2, "text": text}

    p_pr = paragraph._p.pPr
    is_list = p_pr is not None and p_pr.numPr is not None
    if is_list or "list" in lowered:
        return {"type": "list_item", "text": text, "ordered": False}
    return {"type": "paragraph", "text": text}


def _docx_table_block(table: Table) -> tuple[dict[str, Any] | None, bool]:
    rows: list[list[str]] = []
    truncated = False
    for row_index, row in enumerate(table.rows):
        if row_index >= MAX_TABLE_ROWS:
            truncated = True
            break
        values = [_clean_text(cell.text) for cell in row.cells[:MAX_TABLE_COLS]]
        if len(row.cells) > MAX_TABLE_COLS:
            truncated = True
        if any(values):
            rows.append(values)
    rows = _normalize_table(rows)
    if not rows:
        return None, truncated
    return {"type": "table", "rows": rows, "header": len(rows) > 1}, truncated


# ---------------------------------------------------------------------------
# XLSX
# ---------------------------------------------------------------------------


def _parse_xlsx(path: Path) -> ParsedDocument:
    images_by_sheet, assets, skipped_images = _xlsx_images(path)
    try:
        workbook = load_workbook(filename=str(path), read_only=True, data_only=True)
    except Exception as exc:
        raise DocumentParseError("Excel 文档解析失败，请确认文件未加密且格式正确") from exc

    blocks: list[dict[str, Any]] = []
    truncated = False
    sheet_count = 0
    try:
        for sheet in workbook.worksheets:
            if sheet.sheet_state != "visible":
                continue
            sheet_count += 1
            raw_rows: list[list[str]] = []
            for row_index, row in enumerate(sheet.iter_rows(values_only=True)):
                if row_index >= MAX_TABLE_ROWS:
                    truncated = True
                    break
                values = [_format_cell(value) for value in row[:MAX_TABLE_COLS]]
                if len(row) > MAX_TABLE_COLS:
                    truncated = True
                if any(values):
                    raw_rows.append(values)
            rows = _normalize_table(raw_rows)
            sheet_images = images_by_sheet.get(sheet.title, [])
            if not rows and not sheet_images:
                continue
            blocks.append({"type": "heading", "level": 1, "text": f"工作表：{sheet.title}"})
            if rows:
                blocks.append({"type": "table", "rows": rows, "header": len(rows) > 1})
            blocks.extend(sheet_images)
    finally:
        workbook.close()

    if sheet_count == 0:
        raise DocumentParseError("Excel 文件中没有可读取的工作表")

    meta = {
        "format": "xlsx",
        "paragraph_count": 0,
        "table_count": sheet_count,
        "sheet_count": sheet_count,
        "page_count": 0,
        "image_count": len(assets),
        "image_skipped": skipped_images,
        "truncated": truncated,
    }
    return ParsedDocument(blocks=_limit_blocks(blocks), text="", meta=meta, assets=assets)


def _xlsx_images(
    path: Path,
) -> tuple[dict[str, list[dict[str, Any]]], list[ParsedAsset], int]:
    """Extract drawings from worksheets without giving up read-only cell parsing."""
    try:
        with zipfile.ZipFile(path) as archive:
            if not any(name.startswith("xl/media/") for name in archive.namelist()):
                return {}, [], 0
    except zipfile.BadZipFile:
        return {}, [], 0

    try:
        image_workbook = load_workbook(
            filename=str(path), read_only=False, data_only=False, keep_links=False
        )
    except Exception:  # noqa: BLE001 - images are best-effort, text parsing continues
        return {}, [], 0

    blocks_by_sheet: dict[str, list[dict[str, Any]]] = defaultdict(list)
    assets: list[ParsedAsset] = []
    cache: dict[str, ParsedAsset] = {}
    skipped = 0

    try:
        for sheet in image_workbook.worksheets:
            if sheet.sheet_state != "visible":
                continue
            images = list(getattr(sheet, "_images", []) or [])
            images.sort(key=_xlsx_anchor_key)
            for image in images:
                if len(assets) >= MAX_IMAGES:
                    skipped += 1
                    continue
                try:
                    data = image._data()
                except Exception:  # noqa: BLE001 - skip unsupported EMF/WMF/corrupt drawings
                    skipped += 1
                    continue
                if len(data) > MAX_IMAGE_BYTES:
                    skipped += 1
                    continue
                total_bytes = sum(len(item.data) for item in assets)
                if total_bytes + len(data) > MAX_TOTAL_IMAGE_BYTES:
                    skipped += 1
                    continue

                digest = hashlib.sha256(data).hexdigest()
                asset = cache.get(digest)
                if asset is None:
                    asset = _prepare_asset(
                        data,
                        key=f"img-{len(assets) + 1}",
                        source_name=f"{sheet.title} 工作表图片",
                    )
                    if asset is None:
                        skipped += 1
                        continue
                    assets.append(asset)
                    cache[digest] = asset

                blocks_by_sheet[sheet.title].append(
                    {
                        "type": "image",
                        "asset_key": asset.key,
                        "alt": f"{sheet.title} 工作表图片",
                        "width": asset.width,
                        "height": asset.height,
                    }
                )
    finally:
        image_workbook.close()

    return dict(blocks_by_sheet), assets, skipped


def _xlsx_anchor_key(image: Any) -> tuple[int, int]:
    try:
        return (int(image.anchor._from.row), int(image.anchor._from.col))
    except (AttributeError, TypeError, ValueError):
        return (10**6, 10**6)


def _prepare_asset(
    data: bytes,
    key: str,
    source_name: str | None = None,
) -> ParsedAsset | None:
    if not data or len(data) > MAX_IMAGE_BYTES:
        return None

    try:
        with Image.open(BytesIO(data)) as image:
            width, height = image.size
            image_format = str(image.format or "").lower()
            if width <= 0 or height <= 0 or width * height > 80_000_000:
                return None
            if image_format in DIRECT_IMAGE_TYPES:
                mime_type, ext = DIRECT_IMAGE_TYPES[image_format]
                return ParsedAsset(
                    key=key,
                    data=data,
                    mime_type=mime_type,
                    ext=ext,
                    width=width,
                    height=height,
                    source_name=source_name,
                )

            # BMP/TIFF and less common formats are normalised to a browser-safe PNG.
            image.load()
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "A" in image.mode else "RGB")
            buffer = BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            png_data = buffer.getvalue()
            if len(png_data) > MAX_IMAGE_BYTES:
                return None
            return ParsedAsset(
                key=key,
                data=png_data,
                mime_type="image/png",
                ext=".png",
                width=width,
                height=height,
                source_name=source_name,
            )
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        return None


def _format_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return _clean_text(str(value))[:500]


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


def _parse_pdf(path: Path) -> ParsedDocument:
    try:
        reader = PdfReader(str(path), strict=False)
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception as exc:
                raise DocumentParseError("PDF 已加密，无法解析") from exc
        page_count = len(reader.pages)
        if page_count > MAX_PDF_PAGES:
            raise DocumentParseError(f"PDF 页数超过 {MAX_PDF_PAGES} 页，请拆分后上传")
    except DocumentParseError:
        raise
    except Exception as exc:
        raise DocumentParseError("PDF 文件解析失败，请确认文件未损坏") from exc

    blocks: list[dict[str, Any]] = []
    for page_index, page in enumerate(reader.pages):
        try:
            raw_text = page.extract_text() or ""
        except Exception:  # noqa: BLE001 - a broken page should not fail the whole PDF
            raw_text = ""
        text = raw_text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
        paragraphs = _pdf_paragraphs(text)
        if not paragraphs:
            continue
        blocks.append({"type": "page_break", "page": page_index + 1})
        blocks.extend(paragraphs)

    if not any(block["type"] in {"paragraph", "heading", "list_item"} for block in blocks):
        raise DocumentParseError("PDF 未提取到文本内容，可能是扫描件；请上传可复制文本的 PDF")

    meta = {
        "format": "pdf",
        "paragraph_count": len([b for b in blocks if b["type"] in {"paragraph", "heading", "list_item"}]),
        "table_count": 0,
        "sheet_count": 0,
        "page_count": page_count,
        "image_count": 0,
        "image_skipped": 0,
        "truncated": page_count > MAX_PDF_PAGES,
    }
    return ParsedDocument(blocks=_limit_blocks(blocks), text="", meta=meta)


def _pdf_paragraphs(text: str) -> list[dict[str, Any]]:
    lines = [line.strip() for line in text.split("\n")]
    chunks: list[str] = []
    current: list[str] = []

    for line in lines:
        if not line:
            if current:
                chunks.append(" ".join(current))
                current = []
            continue
        if _looks_like_heading(line):
            if current:
                chunks.append(" ".join(current))
                current = []
            chunks.append(line)
            continue
        current.append(line)
        if len(" ".join(current)) > 600:
            chunks.append(" ".join(current))
            current = []
    if current:
        chunks.append(" ".join(current))

    result: list[dict[str, Any]] = []
    for chunk in chunks:
        cleaned = _clean_text(chunk)
        if not cleaned:
            continue
        if _looks_like_heading(cleaned) and len(cleaned) <= 80:
            result.append({"type": "heading", "level": 2, "text": cleaned})
        else:
            result.append({"type": "paragraph", "text": cleaned})
    return result


def _looks_like_heading(line: str) -> bool:
    if len(line) > 80:
        return False
    patterns = (
        r"^第[一二三四五六七八九十百]+[章节部分]",
        r"^\d+(?:\.\d+){0,3}[、.\s]\s*\S",
        r"^[一二三四五六七八九十]+、\s*\S",
        r"^[（(][一二三四五六七八九十\d]+[)）]\s*\S",
        r"^(?:附录|附件)\s*[A-Za-z\d一二三四五六七八九十]*",
    )
    return any(re.match(pattern, line) for pattern in patterns)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\u3000", " ")
    value = re.sub(r"[\t ]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def _normalize_table(rows: list[list[str]]) -> list[list[str]]:
    if not rows:
        return []
    width = max((len(row) for row in rows), default=0)
    if width == 0:
        return []
    normalized = [row + [""] * (width - len(row)) for row in rows]
    # Drop columns that are empty in every row.
    keep = [index for index in range(width) if any(row[index] for row in normalized)]
    normalized = [[row[index] for index in keep] for row in normalized]
    while normalized and not any(normalized[-1]):
        normalized.pop()
    return normalized


def _limit_blocks(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    total = 0
    for block in blocks:
        size = len(str(block))
        if total + size > MAX_BLOCK_CHARS:
            kept.append({"type": "paragraph", "text": "[内容过长，预览已截断，请下载原文件查看完整内容]"})
            break
        kept.append(block)
        total += size
    return kept


def _blocks_to_text(blocks: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for block in blocks:
        if block["type"] == "heading":
            parts.append(f"\n{'#' * int(block.get('level', 1))} {block['text']}\n")
        elif block["type"] in {"paragraph", "list_item"}:
            parts.append(str(block.get("text", "")))
        elif block["type"] == "table":
            for row in block.get("rows", []):
                parts.append(" | ".join(str(cell) for cell in row))
        elif block["type"] == "page_break":
            parts.append(f"\n--- 第 {block.get('page')} 页 ---\n")
    return "\n".join(part for part in parts if part).strip()


def _build_summary(blocks: list[dict[str, Any]]) -> str | None:
    for block in blocks:
        if block["type"] == "paragraph":
            text = _clean_text(str(block.get("text", "")))
            if len(text) >= 12:
                return text[:220] + ("…" if len(text) > 220 else "")
    for block in blocks:
        if block["type"] == "heading":
            return str(block.get("text", ""))[:220]
    return None
