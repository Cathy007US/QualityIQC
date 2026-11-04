import logging
from time import sleep

from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Category, CategoryTranslation, User
from app.security import hash_password

logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    {
        "name": "电池片检验",
        "slug": "solar-cell",
        "name_en": "Solar Cell Inspection",
        "description_en": "Cell appearance, EL, dimensions and electrical performance",
        "description": "单晶/多晶电池片外观、EL、尺寸与电性能",
        "color": "teal",
        "sort_order": 10,
    },
    {
        "name": "光伏玻璃",
        "slug": "pv-glass",
        "name_en": "PV Glass",
        "description_en": "Transmittance, thickness, coating and visual defects",
        "description": "透光率、厚度、尺寸、镀膜与外观缺陷",
        "color": "blue",
        "sort_order": 20,
    },
    {
        "name": "封装胶膜",
        "slug": "encapsulation-film",
        "name_en": "Encapsulation Film",
        "description_en": "EVA / POE gram weight, gel content, peel strength and shrinkage",
        "description": "EVA / POE 克重、交联度、剥离强度与收缩率",
        "color": "amber",
        "sort_order": 30,
    },
    {
        "name": "铝边框",
        "slug": "aluminum-frame",
        "name_en": "Aluminum Frame",
        "description_en": "Profile dimensions, coating thickness, salt spray and assembly",
        "description": "型材尺寸、膜厚、盐雾、角码与装配质量",
        "color": "violet",
        "sort_order": 40,
    },
    {
        "name": "接线盒",
        "slug": "junction-box",
        "name_en": "Junction Box",
        "description_en": "Diodes, terminal pull force, ingress protection and flame retardancy",
        "description": "二极管、端子拉力、防护等级与阻燃要求",
        "color": "rose",
        "sort_order": 50,
    },
    {
        "name": "焊带辅材",
        "slug": "ribbon-material",
        "name_en": "Ribbon & Materials",
        "description_en": "Ribbons, busbars, silicone and flux for module assembly",
        "description": "焊带、汇流条、硅胶、助焊剂等组件辅材",
        "color": "cyan",
        "sort_order": 60,
    },
]


def wait_for_database(max_attempts: int = 30, delay_seconds: float = 2.0) -> None:
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
            return
        except OperationalError:
            if attempt == max_attempts:
                raise
            logger.warning("Database not ready (attempt %s/%s), retrying...", attempt, max_attempts)
            sleep(delay_seconds)


def init_database() -> None:
    wait_for_database()
    migrate_schema()
    Base.metadata.create_all(bind=engine)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        seed_categories(db)
        seed_admin(db)


def migrate_schema() -> None:
    """Apply small, idempotent upgrades without deleting existing documents."""
    with engine.begin() as connection:
        if connection.scalar(text("select to_regclass('public.documents')")) is None:
            return
        connection.execute(text("alter table documents add column if not exists locale varchar(10)"))
        connection.execute(
            text("update documents set locale = 'zh-CN' where locale is null or locale = ''")
        )
        connection.execute(
            text("alter table documents alter column locale set default 'zh-CN'")
        )
        connection.execute(text("alter table documents alter column locale set not null"))
        connection.execute(text("drop index if exists ix_documents_document_no"))
        connection.execute(text("alter table documents drop constraint if exists documents_document_no_key"))
        connection.execute(
            text(
                "create unique index if not exists uq_documents_document_no_locale "
                "on documents (document_no, locale)"
            )
        )
        connection.execute(
            text("create index if not exists ix_documents_locale on documents (locale)")
        )
        connection.execute(
            text(
                "create index if not exists ix_documents_locale_status_updated "
                "on documents (locale, status, updated_at)"
            )
        )
    logger.info("Document locale schema is ready")


def seed_categories(db: Session) -> None:
    existing = {category.slug: category for category in db.scalars(select(Category)).all()}
    created = False
    for item in DEFAULT_CATEGORIES:
        if item["slug"] not in existing:
            payload = {key: value for key, value in item.items() if not key.endswith("_en")}
            category = Category(**payload)
            db.add(category)
            db.flush()
            existing[category.slug] = category
            created = True
    for item in DEFAULT_CATEGORIES:
        category = existing[item["slug"]]
        english = next(
            (row for row in category.translations if row.locale == "en-US"),
            None,
        )
        if english is None:
            db.add(
                CategoryTranslation(
                    category_id=category.id,
                    locale="en-US",
                    name=item["name_en"],
                    description=item["description_en"],
                )
            )
            created = True
    if created:
        db.commit()
        logger.info("Default categories and English translations seeded")


def seed_admin(db: Session) -> None:
    if not settings.admin_password:
        logger.warning("ADMIN_PASSWORD is empty, admin user was not created")
        return
    existing = db.scalar(select(User).where(User.username == settings.admin_username))
    if existing:
        return
    if len(settings.admin_password.encode("utf-8")) > 72:
        raise RuntimeError("ADMIN_PASSWORD 超过 bcrypt 支持的 72 字节上限")
    db.add(
        User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            display_name=settings.admin_display_name,
            role="admin",
            is_active=True,
        )
    )
    db.commit()
    logger.info("Admin user '%s' created", settings.admin_username)
