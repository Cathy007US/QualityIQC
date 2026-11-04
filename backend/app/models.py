from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, default="光伏质量部管理员")
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    documents: Mapped[list["Document"]] = relationship(back_populates="uploaded_by")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(300))
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="teal")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    documents: Mapped[list["Document"]] = relationship(back_populates="category")
    translations: Mapped[list["CategoryTranslation"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CategoryTranslation(Base):
    __tablename__ = "category_translations"
    __table_args__ = (
        UniqueConstraint("category_id", "locale", name="uq_category_translation_locale"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category] = relationship(back_populates="translations")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("file_size >= 0", name="ck_documents_file_size"),
        CheckConstraint("download_count >= 0", name="ck_documents_download_count"),
        UniqueConstraint("document_no", "locale", name="uq_documents_document_no_locale"),
        Index("ix_documents_tags_gin", "tags", postgresql_using="gin"),
        Index("ix_documents_status_updated", "status", "updated_at"),
        Index("ix_documents_locale_status_updated", "locale", "status", "updated_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_no: Mapped[str] = mapped_column(String(64), nullable=False)
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="zh-CN", index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    doc_type: Mapped[str] = mapped_column(String(40), nullable=False, default="other", index=True)
    product_line: Mapped[str | None] = mapped_column(String(120))
    supplier: Mapped[str | None] = mapped_column(String(160))
    revision: Mapped[str] = mapped_column(String(32), nullable=False, default="A0")
    summary: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(64)), nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="published", index=True)

    effective_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_ext: Mapped[str] = mapped_column(String(10), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    content_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    content_meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category | None] = relationship(back_populates="documents", lazy="joined")
    uploaded_by: Mapped[User | None] = relationship(back_populates="documents")
    versions: Mapped[list["DocumentVersion"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    assets: Mapped[list["DocumentAsset"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="DocumentAsset.sort_order"
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    __table_args__ = (UniqueConstraint("document_id", "version", name="uq_document_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    revision: Mapped[str] = mapped_column(String(32), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    change_note: Mapped[str | None] = mapped_column(String(500))
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    document: Mapped[Document] = relationship(back_populates="versions")


class DocumentAsset(Base):
    __tablename__ = "document_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    source_name: Mapped[str | None] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    document: Mapped[Document] = relationship(back_populates="assets")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    username: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(40), nullable=False, default="document")
    target_id: Mapped[int | None] = mapped_column(Integer)
    detail: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
