from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID


def _demo_tokens(value: str) -> dict[str, UUID]:
    if not value:
        return {}

    try:
        raw = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError("VITA_DEMO_TOKENS debe ser un objeto JSON") from exc

    if not isinstance(raw, dict):
        raise ValueError("VITA_DEMO_TOKENS debe ser un objeto JSON")

    tokens: dict[str, UUID] = {}
    for token, user_id in raw.items():
        if not isinstance(token, str) or len(token) < 16:
            raise ValueError("Cada token de demo debe tener al menos 16 caracteres")
        if not isinstance(user_id, str):
            raise ValueError("Cada usuario de VITA_DEMO_TOKENS debe ser un UUID")
        try:
            tokens[token] = UUID(user_id)
        except ValueError as exc:
            raise ValueError("Cada usuario de VITA_DEMO_TOKENS debe ser un UUID") from exc
    return tokens


@dataclass(frozen=True)
class Settings:
    database_url: str = "postgresql://vita_api:vita-api@localhost:5432/vita"
    migration_database_url: str | None = None
    storage_dir: Path = Path("/tmp/vita-private")
    openclaw_base_url: str = "http://127.0.0.1:18789/v1"
    openclaw_token: str = ""
    openclaw_agent_id: str = "orquestador"
    openclaw_timeout_seconds: int = 120
    max_upload_bytes: int = 10 * 1024 * 1024
    max_image_dimension: int = 8000
    max_image_pixels: int = 20_000_000
    demo_tokens: dict[str, UUID] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> Settings:
        timeout = int(os.getenv("OPENCLAW_TIMEOUT_SECONDS", "120"))
        if not 5 <= timeout <= 3600:
            raise ValueError("OPENCLAW_TIMEOUT_SECONDS debe estar entre 5 y 3600")

        max_upload = int(os.getenv("VITA_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
        max_dimension = int(os.getenv("VITA_MAX_IMAGE_DIMENSION", "8000"))
        max_pixels = int(os.getenv("VITA_MAX_IMAGE_PIXELS", "20000000"))
        if min(max_upload, max_dimension, max_pixels) <= 0:
            raise ValueError("Los límites de imágenes deben ser positivos")

        agent_id = os.getenv("OPENCLAW_AGENT_ID", "orquestador")
        if not agent_id or any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for char in agent_id):
            raise ValueError("OPENCLAW_AGENT_ID no es válido")

        openclaw_base_url = os.getenv(
            "OPENCLAW_BASE_URL",
            "http://127.0.0.1:18789/v1",
        ).rstrip("/")
        parsed_url = urlsplit(openclaw_base_url)
        if (
            parsed_url.scheme not in {"http", "https"}
            or not parsed_url.netloc
            or parsed_url.username is not None
            or parsed_url.password is not None
        ):
            raise ValueError("OPENCLAW_BASE_URL debe ser una URL HTTP(S) sin credenciales")

        return cls(
            database_url=os.getenv(
                "DATABASE_URL",
                "postgresql://vita_api:vita-api@localhost:5432/vita",
            ),
            migration_database_url=os.getenv("MIGRATION_DATABASE_URL"),
            storage_dir=Path(os.getenv("VITA_STORAGE_DIR", "/tmp/vita-private")),
            openclaw_base_url=openclaw_base_url,
            openclaw_token=os.getenv("OPENCLAW_TOKEN", ""),
            openclaw_agent_id=agent_id,
            openclaw_timeout_seconds=timeout,
            max_upload_bytes=max_upload,
            max_image_dimension=max_dimension,
            max_image_pixels=max_pixels,
            demo_tokens=_demo_tokens(os.getenv("VITA_DEMO_TOKENS", "")),
        )
