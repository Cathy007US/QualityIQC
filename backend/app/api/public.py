from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import and_, func, select, update
from sqlalchemy.orm import joinedload, selectinload

from app.deps import DbSession
from app.locale import Locale
from app.models import Category, CategoryTranslation, Document, DocumentAsset
from app.schemas import (
    CategoryOut,
    CategoryStat,
    DocumentDetail,
    DocumentSummary,
    Page,
    PublicStats,
    RecentDocument,
)
from app.services.documents import (
    safe_asset_path,
    safe_file_path,
    to_category_out,
    to_detail,
    to_summary,
)

router = APIRouter(tags=["公开浏览"])

SortOption = Literal["updated_desc", "downloads_desc", "title_asc"]
DocTypeFilter = Literal[
    "inspection_spec",
    "work_instruction",
    "sampling_plan",
    "form",
    "supplier_standard",
    "equipment_sop",
    "other",
]


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _search_conditions(q: str | None, locale: str) -> list:
    conditions = []
    if not q:
        return conditions
    localized_category = func.coalesce(
        select(CategoryTranslation.name)
        .where(
            CategoryTranslation.category_id == Category.id,
            CategoryTranslation.locale == locale,
        )
        .limit(1)
        .scalar_subquery(),
        Category.name,
    )
    haystack = func.concat_ws(
        " ",
        Document.title,
        Document.document_no,
        func.coalesce(Document.summary, ""),
        func.coalesce(Document.content_text, ""),
        func.coalesce(Document.product_line, ""),
        func.coalesce(Document.supplier, ""),
        localized_category,
        func.array_to_string(Document.tags, " "),
    )
    for term in [part for part in q.strip().split() if part][:8]:
        conditions.append(haystack.ilike(f"%{_escape_like(term)}%", escape="\\"))
    return conditions


def _published_conditions() -> list:
    return [
        Document.is_deleted.is_(False),
        Document.status == "published",
    ]


@router.get("/documents", response_model=Page[DocumentSummary], summary="检索公开文档")
def list_documents(
    db: DbSession,
    locale: Locale,
    q: Annotated[str | None, Query(max_length=100, description="关键词")] = None,
    category: Annotated[str | None, Query(max_length=80, description="分类 slug")] = None,
    doc_type: Annotated[DocTypeFilter | None, Query()] = None,
    sort: Annotated[SortOption, Query()] = "updated_desc",
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 12,
) -> Page[DocumentSummary]:
    conditions = [*_published_conditions(), Document.locale == locale]
    if category:
        conditions.append(Category.slug == category)
    if doc_type:
        conditions.append(Document.doc_type == doc_type)
    conditions.extend(_search_conditions(q, locale))

    total = db.scalar(
        select(func.count(Document.id)).select_from(Document).join(Category).where(*conditions)
    ) or 0

    statement = (
        select(Document)
        .join(Category)
        .options(joinedload(Document.category), selectinload(Document.uploaded_by))
        .where(*conditions)
    )
    if sort == "downloads_desc":
        statement = statement.order_by(Document.download_count.desc(), Document.updated_at.desc())
    elif sort == "title_asc":
        statement = statement.order_by(Document.title.asc())
    else:
        statement = statement.order_by(Document.updated_at.desc(), Document.id.desc())

    documents = db.scalars(statement.offset((page - 1) * page_size).limit(page_size)).all()
    pages = (total + page_size - 1) // page_size if total else 0
    return Page(
        items=[to_summary(document, locale) for document in documents],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/documents/{document_id}", response_model=DocumentDetail, summary="文档详情")
def get_document(document_id: int, db: DbSession, locale: Locale) -> DocumentDetail:
    document = db.scalar(
        select(Document)
        .options(joinedload(Document.category), selectinload(Document.uploaded_by))
        .where(
            Document.id == document_id,
            Document.locale == locale,
            Document.is_deleted.is_(False),
            Document.status == "published",
        )
    )
    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found or unpublished" if locale == "en-US" else "文档不存在或已下架",
        )
    alternate = db.scalar(
        select(Document.id).where(
            Document.document_no == document.document_no,
            Document.locale != document.locale,
            Document.is_deleted.is_(False),
            Document.status == "published",
        )
    )
    detail = to_detail(document, locale)
    detail.alternate_document_id = alternate
    return detail


@router.get(
    "/documents/{document_id}/related",
    response_model=list[DocumentSummary],
    summary="同类文档",
)
def related_documents(
    document_id: int,
    db: DbSession,
    locale: Locale,
    limit: Annotated[int, Query(ge=1, le=8)] = 4,
) -> list[DocumentSummary]:
    document = db.get(Document, document_id)
    if (
        document is None
        or document.is_deleted
        or document.status != "published"
        or document.locale != locale
    ):
        detail = "Document not found or unpublished" if locale == "en-US" else "文档不存在或已下架"
        raise HTTPException(status_code=404, detail=detail)
    documents = db.scalars(
        select(Document)
        .options(joinedload(Document.category), selectinload(Document.uploaded_by))
        .where(
            Document.category_id == document.category_id,
            Document.id != document.id,
            Document.locale == locale,
            Document.is_deleted.is_(False),
            Document.status == "published",
        )
        .order_by(Document.updated_at.desc())
        .limit(limit)
    ).all()
    return [to_summary(item, locale) for item in documents]


@router.get("/documents/{document_id}/download", summary="下载原始文件")
def download_document(document_id: int, db: DbSession) -> FileResponse:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted or document.status != "published":
        raise HTTPException(status_code=404, detail="文档不存在或已下架")
    try:
        path = safe_file_path(document.stored_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="文件不存在") from None
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在，请联系管理员")

    db.execute(
        update(Document)
        .where(Document.id == document.id)
        .values(download_count=Document.download_count + 1)
    )
    db.commit()

    fallback = f"iqc-document-{document.id}{document.file_ext}"
    disposition = f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(document.file_name)}"
    return FileResponse(
        path=path,
        media_type=document.mime_type,
        headers={
            "Content-Disposition": disposition,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@router.get(
    "/documents/{document_id}/assets/{asset_id}",
    summary="读取文档内嵌图片",
    response_class=FileResponse,
)
def download_document_asset(document_id: int, asset_id: int, db: DbSession) -> FileResponse:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted or document.status != "published":
        raise HTTPException(status_code=404, detail="文档不存在或已下架")
    asset = db.scalar(
        select(DocumentAsset).where(
            DocumentAsset.id == asset_id,
            DocumentAsset.document_id == document_id,
        )
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="图片不存在")
    try:
        path = safe_asset_path(asset.stored_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="图片不存在") from None
    if not path.exists():
        raise HTTPException(status_code=404, detail="图片文件不存在")
    return FileResponse(
        path=path,
        media_type=asset.mime_type,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.get("/categories", response_model=list[CategoryOut], summary="分类及文档数量")
def list_categories(db: DbSession, locale: Locale) -> list[CategoryOut]:
    rows = db.execute(
        select(Category, func.count(Document.id))
        .outerjoin(
            Document,
            and_(
                Document.category_id == Category.id,
                Document.locale == locale,
                Document.is_deleted.is_(False),
                Document.status == "published",
            ),
        )
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.id)
    ).all()
    return [to_category_out(category, count, locale) for category, count in rows]


@router.get("/stats", response_model=PublicStats, summary="知识库概览统计")
def public_stats(db: DbSession, locale: Locale) -> PublicStats:
    conditions = [*_published_conditions(), Document.locale == locale]
    document_count = db.scalar(select(func.count(Document.id)).where(*conditions)) or 0
    category_count = db.scalar(select(func.count(Category.id))) or 0
    download_count = db.scalar(
        select(func.coalesce(func.sum(Document.download_count), 0)).where(*conditions)
    ) or 0
    type_count = db.scalar(
        select(func.count(func.distinct(Document.doc_type))).where(*conditions)
    ) or 0
    latest = db.scalar(select(func.max(Document.updated_at)).where(*conditions))

    category_rows = db.execute(
        select(Category, func.count(Document.id))
        .outerjoin(
            Document,
            and_(
                Document.category_id == Category.id,
                Document.locale == locale,
                Document.is_deleted.is_(False),
                Document.status == "published",
            ),
        )
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.id)
    ).all()
    categories = []
    for category, count in category_rows:
        localized = to_category_out(category, count, locale)
        categories.append(
            CategoryStat(
                id=category.id,
                name=localized.name,
                slug=category.slug,
                color=category.color,
                count=count,
            )
        )

    recent_rows = db.scalars(
        select(Document)
        .options(joinedload(Document.category))
        .where(*conditions)
        .order_by(Document.updated_at.desc())
        .limit(5)
    ).all()
    popular_rows = db.scalars(
        select(Document)
        .options(joinedload(Document.category))
        .where(*conditions)
        .order_by(Document.download_count.desc(), Document.updated_at.desc())
        .limit(5)
    ).all()

    def recent_item(document: Document) -> RecentDocument:
        return RecentDocument(
            id=document.id,
            title=document.title,
            document_no=document.document_no,
            category_name=to_category_out(document.category, 0, locale).name,
            file_ext=document.file_ext,
            updated_at=document.updated_at,
        )

    return PublicStats(
        document_count=document_count,
        category_count=category_count,
        download_count=int(download_count),
        type_count=type_count,
        latest_updated_at=latest if isinstance(latest, datetime) else None,
        categories=categories,
        recent_documents=[recent_item(item) for item in recent_rows],
        popular_documents=[recent_item(item) for item in popular_rows],
    )
