from uuid import UUID

import pytest

from app.chat_vision import (
    ChatVisionCapacityError,
    ChatVisionReferenceError,
    ChatVisionVault,
    VisionImage,
)

ALBA = UUID("11111111-1111-4111-8111-111111111111")
CARLA = UUID("33333333-3333-4333-8333-333333333333")


def test_references_are_owner_scoped_and_consumed_once() -> None:
    vault = ChatVisionVault()
    image = VisionImage(b"image-bytes", "image/png")
    reference = vault.store(ALBA, [image])[0]

    assert vault.belongs_to([reference], ALBA)
    assert not vault.belongs_to([reference], CARLA)
    assert vault.consume(reference) == image
    with pytest.raises(ChatVisionReferenceError):
        vault.consume(reference)


def test_expired_images_are_purged_and_memory_has_a_hard_limit() -> None:
    now = [0.0]
    vault = ChatVisionVault(ttl_seconds=5, max_images=1, max_bytes=10, clock=lambda: now[0])
    vault.store(ALBA, [VisionImage(b"12345", "image/png")])
    with pytest.raises(ChatVisionCapacityError):
        vault.store(ALBA, [VisionImage(b"abc", "image/png")])

    now[0] = 6.0
    reference = vault.store(CARLA, [VisionImage(b"abc", "image/png")])[0]
    assert vault.belongs_to([reference], CARLA)
