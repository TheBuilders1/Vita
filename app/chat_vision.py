from __future__ import annotations

import secrets
import threading
import time
from dataclasses import dataclass
from uuid import UUID

from app.security import token_digest

VISION_REFERENCE_TTL_SECONDS = 300
MAX_PENDING_IMAGES = 16
MAX_PENDING_BYTES = 60 * 1024 * 1024


class ChatVisionCapacityError(RuntimeError):
    pass


class ChatVisionReferenceError(RuntimeError):
    pass


@dataclass(frozen=True)
class VisionImage:
    data: bytes
    mime_type: str


@dataclass(frozen=True)
class _PendingImage:
    owner_id: UUID
    image: VisionImage
    expires_at: float


class ChatVisionVault:
    """Imágenes autorizadas en memoria; una referencia solo puede leerse una vez."""

    def __init__(
        self,
        ttl_seconds: int = VISION_REFERENCE_TTL_SECONDS,
        max_images: int = MAX_PENDING_IMAGES,
        max_bytes: int = MAX_PENDING_BYTES,
        clock=time.monotonic,
    ):
        self._ttl_seconds = ttl_seconds
        self._max_images = max_images
        self._max_bytes = max_bytes
        self._clock = clock
        self._images: dict[str, _PendingImage] = {}
        self._bytes = 0
        self._lock = threading.Lock()

    def store(self, owner_id: UUID, images: list[VisionImage]) -> list[str]:
        if not images:
            raise ValueError("empty_vision_upload")
        if any(
            not image.data
            or len(image.data) > 10 * 1024 * 1024
            or image.mime_type not in {"image/jpeg", "image/png"}
            for image in images
        ):
            raise ValueError("invalid_vision_image")

        with self._lock:
            self._purge_expired()
            total_bytes = sum(len(image.data) for image in images)
            if (
                len(self._images) + len(images) > self._max_images
                or self._bytes + total_bytes > self._max_bytes
            ):
                raise ChatVisionCapacityError

            references: list[str] = []
            for image in images:
                reference = secrets.token_urlsafe(32)
                while token_digest(reference) in self._images:
                    reference = secrets.token_urlsafe(32)
                self._images[token_digest(reference)] = _PendingImage(
                    owner_id=owner_id,
                    image=image,
                    expires_at=self._clock() + self._ttl_seconds,
                )
                references.append(reference)
            self._bytes += total_bytes
            return references

    def belongs_to(self, references: list[str], owner_id: UUID) -> bool:
        with self._lock:
            self._purge_expired()
            return all(
                (pending := self._images.get(token_digest(reference))) is not None
                and pending.owner_id == owner_id
                for reference in references
            )

    def consume(self, reference: str) -> VisionImage:
        with self._lock:
            pending = self._images.pop(token_digest(reference), None)
            if pending is None:
                raise ChatVisionReferenceError
            self._bytes -= len(pending.image.data)
            if pending.expires_at <= self._clock():
                raise ChatVisionReferenceError
            return pending.image

    def discard(self, reference: str) -> None:
        with self._lock:
            pending = self._images.pop(token_digest(reference), None)
            if pending is not None:
                self._bytes -= len(pending.image.data)

    def _purge_expired(self) -> None:
        now = self._clock()
        expired = [
            key for key, pending in self._images.items()
            if pending.expires_at <= now
        ]
        for key in expired:
            self._bytes -= len(self._images.pop(key).image.data)
