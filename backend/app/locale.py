from typing import Annotated

from fastapi import Depends, Query, Request

DEFAULT_LOCALE = "zh-CN"
SUPPORTED_LOCALES = ("zh-CN", "en-US")


def normalize_locale(value: str | None) -> str:
    if not value:
        return DEFAULT_LOCALE
    candidate = value.strip().lower().replace("_", "-")
    if candidate.startswith("en"):
        return "en-US"
    if candidate.startswith("zh"):
        return "zh-CN"
    return DEFAULT_LOCALE


def get_locale(
    request: Request,
    lang: Annotated[str | None, Query(max_length=20, description="zh-CN 或 en-US")] = None,
) -> str:
    return normalize_locale(lang or request.headers.get("accept-language"))


Locale = Annotated[str, Depends(get_locale)]
