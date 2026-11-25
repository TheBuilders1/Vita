"""Archivos de documentos en disco: PostgreSQL guarda solo su nombre (storage_key)."""

from __future__ import annotations

import logging
import re
import time
from pathlib import Path

from app.config import Settings
from app.database import connect

logger = logging.getLogger(__name__)

# Lo que escribe _save_private_file: nada más se toca en la carpeta.
STORED_NAME = re.compile(r"^[0-9a-f]{32}\.(?:jpg|png|pdf)$")
# Una subida escribe el archivo antes de confirmar su fila: hasta entonces parece huérfano.
ORPHAN_GRACE_SECONDS = 3600


def stored_path(root: Path, storage_key: str) -> Path:
    if not STORED_NAME.fullmatch(storage_key):
        raise ValueError("storage_key no válido")
    return root / storage_key


def remove_stored(root: Path, storage_key: str) -> None:
    """Si falla, el archivo queda huérfano y lo borra la siguiente limpieza."""
    try:
        stored_path(root, storage_key).unlink(missing_ok=True)
    except (OSError, ValueError):
        logger.warning("stored_file_not_removed storage_key=%s", storage_key)


def purge_orphans(settings: Settings, grace_seconds: int = ORPHAN_GRACE_SECONDS) -> int:
    root = settings.storage_dir
    if not root.is_dir():
        return 0
    with connect(settings) as conn:
        known = {row["storage_key"] for row in conn.execute("SELECT storage_key FROM producto.documents")}
    limit = time.time() - grace_seconds
    removed = 0
    for path in root.iterdir():
        if not STORED_NAME.fullmatch(path.name) or path.name in known or not path.is_file():
            continue
        if path.stat().st_mtime >= limit:
            continue
        path.unlink(missing_ok=True)
        removed += 1
    if removed:
        logger.info("orphan_files_purged count=%s", removed)
    return removed
