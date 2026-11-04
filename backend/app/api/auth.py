from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser
from app.models import User
from app.schemas import LoginRequest, TokenOut, UserOut
from app.security import (
    create_access_token,
    get_client_ip,
    login_limiter,
    verify_password,
)
from app.services.documents import audit

router = APIRouter(prefix="/auth", tags=["鉴权"])


@router.post("/login", response_model=TokenOut, summary="管理员登录")
def login(payload: LoginRequest, request: Request, db: Annotated[Session, Depends(get_db)]) -> TokenOut:
    ip = get_client_ip(request)
    limiter_key = f"{ip}:{payload.username.lower()}"
    if login_limiter.is_blocked(limiter_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="尝试次数过多，请 15 分钟后再试",
        )

    user = db.scalar(select(User).where(User.username == payload.username.strip()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        login_limiter.fail(limiter_key)
        audit(
            db,
            None,
            action="login_failed",
            target_type="user",
            detail=f"username={payload.username[:64]}",
            ip_address=ip,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_limiter.reset(limiter_key)
    user.last_login_at = datetime.now(UTC)
    token, expires_in = create_access_token(user.id, user.username)
    audit(db, user, action="login", target_type="user", target_id=user.id, ip_address=ip)
    db.commit()

    return TokenOut(
        access_token=token,
        expires_in=expires_in,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut, summary="当前登录用户")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
