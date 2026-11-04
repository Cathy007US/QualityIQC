from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_name: str = "quality-Iqc 太阳能 IQC 检验标准知识库"
    environment: str = "development"
    api_prefix: str = "/api"

    database_url: str = "postgresql+psycopg://iqc:iqc_local_password@localhost:5432/iqc_insp"
    secret_key: str = "please-change-me-in-production"
    access_token_expire_minutes: int = 8 * 60
    jwt_algorithm: str = "HS256"

    upload_dir: Path = Path("uploads")
    max_upload_mb: int = 25

    admin_username: str = "admin"
    admin_password: str = "Admin@123456"
    admin_display_name: str = "光伏质量部管理员"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    seed_demo: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
