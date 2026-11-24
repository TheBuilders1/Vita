from __future__ import annotations

import hashlib
import hmac
from uuid import UUID

from fastapi import HTTPException, Request


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def user_for_token(token: str, tokens: dict[str, UUID]) -> UUID:
    supplied = hashlib.sha256(token.encode("utf-8")).digest()
    for configured_token, user_id in tokens.items():
        expected = hashlib.sha256(configured_token.encode("utf-8")).digest()
        if hmac.compare_digest(supplied, expected):
            return user_id
    raise HTTPException(status_code=401, detail="invalid_token")


def bearer_token(request: Request) -> str:
    authorization = request.headers.get("authorization", "")
    scheme, separator, value = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not value.strip():
        raise HTTPException(
            status_code=401,
            detail="invalid_token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return value.strip()


def authenticated_user(request: Request) -> UUID:
    token = bearer_token(request)
    return user_for_token(token, request.app.state.settings.demo_tokens)
