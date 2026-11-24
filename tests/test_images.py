from io import BytesIO

import pytest
from PIL import Image

from app.images import ImageRejected, inspect_image


def png_bytes(size: tuple[int, int] = (32, 24)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, "white").save(output, format="PNG")
    return output.getvalue()


def test_accepts_decodable_png() -> None:
    metadata = inspect_image(
        png_bytes(),
        "image/png",
        max_bytes=100_000,
        max_dimension=100,
        max_pixels=10_000,
    )

    assert (metadata.mime_type, metadata.extension) == ("image/png", "png")
    assert (metadata.width, metadata.height) == (32, 24)


def test_rejects_oversized_image() -> None:
    with pytest.raises(ImageRejected, match="image_too_large"):
        inspect_image(
            png_bytes(),
            "image/png",
            max_bytes=8,
            max_dimension=100,
            max_pixels=10_000,
        )


def test_rejects_excessive_dimensions() -> None:
    with pytest.raises(ImageRejected, match="image_dimensions_exceeded"):
        inspect_image(
            png_bytes(),
            "image/png",
            max_bytes=100_000,
            max_dimension=20,
            max_pixels=10_000,
        )


def test_rejects_incorrect_mime_and_corrupt_image() -> None:
    with pytest.raises(ImageRejected, match="unsupported_image_type"):
        inspect_image(
            png_bytes(),
            "image/webp",
            max_bytes=100_000,
            max_dimension=100,
            max_pixels=10_000,
        )

    with pytest.raises(ImageRejected, match="invalid_image"):
        inspect_image(
            b"not an image",
            "image/png",
            max_bytes=100_000,
            max_dimension=100,
            max_pixels=10_000,
        )
