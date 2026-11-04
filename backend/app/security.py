from datetime import UTC, datetime, timedelta
from threading import Lock
from time import monotonic

import bcrypt
import jwt
from fastapi import Request

from app.config import settings

MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise ValueError("密码长度超过 72 字节，请缩短密码")
    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        return False
    try:
        return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, username: str) -> tuple[str, int]:
    expires_in = settings.access_token_expire_minutes * 60
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "username": username,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


class LoginRateLimiter:
    """Small in-process guard against brute-force attempts (no Redis required)."""

    def __init__(self, max_attempts: int = 8, window_seconds: int = 900) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = {}
        self._lock = Lock()

    def _recent(self, key: str) -> list[float]:
        cutoff = monotonic() - self.window_seconds
        attempts = [ts for ts in self._attempts.get(key, []) if ts > cutoff]
        if attempts:
            self._attempts[key] = attempts
        else:
            self._attempts.pop(key, None)
        return attempts

    def is_blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key)) >= self.max_attempts

    def fail(self, key: str) -> None:
        with self._lock:
            attempts = self._recent(key)
            attempts.append(monotonic())
            self._attempts[key] = attempts

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)


login_limiter = LoginRateLimiter()
