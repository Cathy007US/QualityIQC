from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import admin, auth, public
from app.config import settings
from app.database import engine
from app.schemas import HealthOut
from app.services.documents import UploadError
from app.services.seed import init_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

APP_VERSION = "1.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.app_name, APP_VERSION)
    init_database()
    logger.info("Database ready, upload dir: %s", settings.upload_dir.resolve())
    yield
    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    version=APP_VERSION,
    description="quality-Iqc · 光伏电池片、玻璃、胶膜、边框、接线盒与焊带辅材的中英文 IQC 检验标准知识库",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=None,
    openapi_url=f"{settings.api_prefix}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(UploadError)
async def upload_error_handler(request: Request, exc: UploadError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get(f"{settings.api_prefix}/health", response_model=HealthOut, tags=["系统"])
def health() -> HealthOut:
    database = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        database = "error"
        logger.exception("Health check database failure")
    return HealthOut(status="ok" if database == "ok" else "degraded", database=database, version=APP_VERSION)


@app.get(f"{settings.api_prefix}", include_in_schema=False)
def api_root() -> dict[str, str]:
    return {"name": settings.app_name, "version": APP_VERSION, "docs": f"{settings.api_prefix}/docs"}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(public.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
