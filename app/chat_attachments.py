from __future__ import annotations

import subprocess
import tempfile
import warnings
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, UnidentifiedImageError

from app.config import Settings
from app.images import ImageRejected, inspect_image
from app.ocr import OcrUnavailable, TesseractOCR

MAX_ATTACHMENT_TEXT = 12_000
MAX_DOCX_XML_BYTES = 2 * 1024 * 1024
PDF_TEXT_PAGES = 10
PDF_OCR_PAGES = 3


class ChatAttachmentError(ValueError):
    def __init__(self, code: str, status_code: int = 422):
        super().__init__(code)
        self.code = code
        self.status_code = status_code


def _pdf_text(data: bytes, ocr: TesseractOCR) -> str:
    try:
        result = subprocess.run(
            [
                "pdftotext",
                "-f",
                "1",
                "-l",
                str(PDF_TEXT_PAGES),
                "-layout",
                "-enc",
                "UTF-8",
                "-",
                "-",
            ],
            input=data,
            capture_output=True,
            timeout=20,
            check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as exc:
        raise ChatAttachmentError("attachment_reader_unavailable", 503) from exc
    if result.returncode != 0:
        raise ChatAttachmentError("invalid_attachment")
    text = result.stdout.decode("utf-8", errors="replace")
    if text.strip():
        return text

    try:
        with tempfile.TemporaryDirectory(prefix="vita-chat-") as temporary:
            directory = Path(temporary)
            source = directory / "attachment.pdf"
            source.write_bytes(data)
            prefix = directory / "page"
            rendered = subprocess.run(
                [
                    "pdftoppm",
                    "-png",
                    "-r",
                    "150",
                    "-scale-to",
                    "1800",
                    "-f",
                    "1",
                    "-l",
                    str(PDF_OCR_PAGES),
                    str(source),
                    str(prefix),
                ],
                capture_output=True,
                timeout=30,
                check=False,
            )
            if rendered.returncode != 0:
                raise ChatAttachmentError("invalid_attachment")
            pages = sorted(directory.glob("page-*.png"))
            if not pages:
                raise ChatAttachmentError("no_text_found")
            return "\n".join(ocr.read_text(page.read_bytes()) for page in pages)
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as exc:
        raise ChatAttachmentError("attachment_reader_unavailable", 503) from exc
    except OcrUnavailable as exc:
        raise ChatAttachmentError("attachment_reader_unavailable", 503) from exc


def _docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            info = archive.getinfo("word/document.xml")
            if info.file_size > MAX_DOCX_XML_BYTES:
                raise ChatAttachmentError("attachment_too_large", 413)
            document = ElementTree.fromstring(archive.read(info))
    except ChatAttachmentError:
        raise
    except (KeyError, OSError, ValueError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        raise ChatAttachmentError("invalid_attachment") from exc

    namespace = {"word": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = [
        "".join(text.text or "" for text in paragraph.findall(".//word:t", namespace))
        for paragraph in document.findall(".//word:p", namespace)
    ]
    return "\n".join(paragraph for paragraph in paragraphs if paragraph)


def _webp_png(data: bytes, settings: Settings) -> bytes:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if image.format != "WEBP":
                    raise ChatAttachmentError("unsupported_attachment_type", 415)
                width, height = image.size
                if (
                    width > settings.max_image_dimension
                    or height > settings.max_image_dimension
                    or width * height > settings.max_image_pixels
                ):
                    raise ChatAttachmentError("image_dimensions_exceeded", 413)
                image.verify()
            with Image.open(BytesIO(data)) as image:
                image.load()
                output = BytesIO()
                image.convert("RGB").save(output, format="PNG")
                return output.getvalue()
    except ChatAttachmentError:
        raise
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as exc:
        raise ChatAttachmentError("invalid_attachment") from exc


def _clean_text(text: str) -> str:
    text = text.replace("\x00", "").strip()
    if not text:
        raise ChatAttachmentError("no_text_found")
    return text[:MAX_ATTACHMENT_TEXT]


def extract_chat_attachment(
    data: bytes,
    filename: str | None,
    content_type: str | None,
    settings: Settings,
    ocr: TesseractOCR,
) -> str:
    if not data:
        raise ChatAttachmentError("empty_attachment")
    if len(data) > settings.max_upload_bytes:
        raise ChatAttachmentError("attachment_too_large", 413)

    suffix = Path(filename or "").suffix.lower()
    if data.startswith(b"\xff\xd8\xff"):
        mime = "image/jpeg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime = "image/png"
    elif data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        mime = "image/webp"
    else:
        mime = content_type or ""

    try:
        if mime in {"image/jpeg", "image/png"}:
            inspect_image(
                data,
                mime,
                settings.max_upload_bytes,
                settings.max_image_dimension,
                settings.max_image_pixels,
            )
            text = ocr.read_text(data)
        elif mime == "image/webp":
            text = ocr.read_text(_webp_png(data, settings))
        elif data.startswith(b"%PDF-") and (suffix == ".pdf" or mime == "application/pdf"):
            text = _pdf_text(data, ocr)
        elif (
            suffix == ".docx"
            or mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ):
            text = _docx_text(data)
        elif suffix == ".txt" or mime == "text/plain":
            try:
                text = data.decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                raise ChatAttachmentError("invalid_attachment") from exc
        else:
            raise ChatAttachmentError("unsupported_attachment_type", 415)
    except ImageRejected as exc:
        raise ChatAttachmentError(exc.code, exc.status_code) from exc
    except OcrUnavailable as exc:
        raise ChatAttachmentError("attachment_reader_unavailable", 503) from exc

    return _clean_text(text)
