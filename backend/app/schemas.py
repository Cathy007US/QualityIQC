from datetime import date, datetime
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

DocType = Literal[
    "inspection_spec",
    "work_instruction",
    "sampling_plan",
    "form",
    "supplier_standard",
    "equipment_sop",
    "other",
]

DOC_TYPE_LABELS: dict[str, str] = {
    "inspection_spec": "检验规范",
    "work_instruction": "作业指导书",
    "sampling_plan": "抽样方案",
    "form": "检验表单",
    "supplier_standard": "供应商标准",
    "equipment_sop": "设备操作",
    "other": "其他",
}

DOC_TYPE_LABELS_EN: dict[str, str] = {
    "inspection_spec": "Inspection Specification",
    "work_instruction": "Work Instruction",
    "sampling_plan": "Sampling Plan",
    "form": "Inspection Form",
    "supplier_standard": "Supplier Standard",
    "equipment_sop": "Equipment SOP",
    "other": "Other",
}


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_zh: str = ""
    name_en: str | None = None
    slug: str
    description: str | None = None
    description_zh: str | None = None
    description_en: str | None = None
    color: str = "teal"
    sort_order: int = 0
    document_count: int = 0


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    name_en: str | None = Field(default=None, max_length=80)
    slug: str | None = Field(default=None, max_length=80, pattern=r"^[a-z0-9-]*$")
    description: str | None = Field(default=None, max_length=300)
    description_en: str | None = Field(default=None, max_length=300)
    color: str = Field(default="teal", max_length=20)
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    name_en: str | None = Field(default=None, max_length=80)
    slug: str | None = Field(default=None, max_length=80, pattern=r"^[a-z0-9-]*$")
    description: str | None = Field(default=None, max_length=300)
    description_en: str | None = Field(default=None, max_length=300)
    color: str | None = Field(default=None, max_length=20)
    sort_order: int | None = None


class DocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_no: str
    locale: str = "zh-CN"
    title: str
    category: CategoryOut
    doc_type: str
    doc_type_label: str = ""
    product_line: str | None = None
    supplier: str | None = None
    revision: str
    summary: str | None = None
    tags: list[str] = []
    status: str = "published"
    effective_date: date | None = None
    expiry_date: date | None = None
    file_name: str
    file_ext: str
    file_size: int
    mime_type: str
    version: int
    download_count: int
    uploaded_by: str | None = None
    created_at: datetime
    updated_at: datetime


class DocumentDetail(DocumentSummary):
    content_blocks: list[dict[str, Any]] = []
    content_meta: dict[str, Any] = {}
    previous_versions: int = 0
    alternate_document_id: int | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    category_id: int | None = None
    doc_type: DocType | None = None
    product_line: str | None = Field(default=None, max_length=120)
    supplier: str | None = Field(default=None, max_length=160)
    revision: str | None = Field(default=None, max_length=32)
    summary: str | None = None
    tags: list[str] | None = None
    status: Literal["published", "archived"] | None = None
    effective_date: date | None = None
    expiry_date: date | None = None


class DocumentVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    revision: str
    file_name: str
    file_size: int
    sha256: str
    change_note: str | None = None
    created_at: datetime


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class CategoryStat(BaseModel):
    id: int
    name: str
    slug: str
    color: str
    count: int


class RecentDocument(BaseModel):
    id: int
    title: str
    document_no: str
    category_name: str
    file_ext: str
    updated_at: datetime


class PublicStats(BaseModel):
    document_count: int
    category_count: int
    download_count: int
    type_count: int
    latest_updated_at: datetime | None = None
    categories: list[CategoryStat] = []
    recent_documents: list[RecentDocument] = []
    popular_documents: list[RecentDocument] = []


class AdminOverview(BaseModel):
    document_count: int
    category_count: int
    download_count: int
    storage_bytes: int
    archived_count: int
    uploads_last_30d: int
    locale_counts: dict[str, int] = {}
    recent_documents: list[DocumentSummary] = []
    category_stats: list[CategoryStat] = []


class HealthOut(BaseModel):
    status: str
    database: str
    version: str


class MessageOut(BaseModel):
    message: str
