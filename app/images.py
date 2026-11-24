from __future__ import annotations

import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, UnidentifiedImageError


class ImageRejected(ValueError):
    def __init__(self, code: str, status_code: int = 422):
        super().__init__(code)
        self.code = code
        self.status_code = status_code


@dataclass(frozen=True)
class ImageMetadata:
    mime_type: str
    extension: str
    width: int
    height: int
    byte_size: int


def inspect_image(
    data: bytes,
    content_type: str | None,
    max_bytes: int,
    max_dimension: int,
    max_pixels: int,
) -> ImageMetadata:
    if not data:
        raise ImageRejected("empty_image")
    if len(data) > max_bytes:
        raise ImageRejected("image_too_large", 413)
    if content_type not in {"image/jpeg", "image/png"}:
        raise ImageRejected("unsupported_image_type")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                image_format = image.format
                width, height = image.size
                if image_format not in {"JPEG", "PNG"}:
                    raise ImageRejected("unsupported_image_type")
                if width > max_dimension or height > max_dimension or width * height > max_pixels:
                    raise ImageRejected("image_dimensions_exceeded", 413)
                image.verify()

            with Image.open(BytesIO(data)) as image:
                image.load()
    except ImageRejected:
        raise
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as exc:
        raise ImageRejected("invalid_image") from exc

    expected_type, extension = {
        "JPEG": ("image/jpeg", "jpg"),
        "PNG": ("image/png", "png"),
    }[image_format]
    if content_type != expected_type:
        raise ImageRejected("image_content_type_mismatch")

    return ImageMetadata(
        mime_type=expected_type,
        extension=extension,
        width=width,
        height=height,
        byte_size=len(data),
    )
