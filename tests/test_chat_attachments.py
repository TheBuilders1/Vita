from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from zipfile import ZipFile

import pytest
from PIL import Image

from app.chat_attachments import ChatAttachmentError, extract_chat_attachment
from app.config import Settings
from app.ocr import OcrUnavailable


class FakeOcr:
    def read_text(self, _data: bytes) -> str:
        return "Texto leído localmente"


def settings() -> Settings:
    return Settings(max_upload_bytes=100_000, max_image_dimension=100, max_image_pixels=10_000)


def png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 24), "white").save(output, format="PNG")
    return output.getvalue()


def webp_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 24), "white").save(output, format="WEBP")
    return output.getvalue()


def docx_bytes(text: str) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        archive.writestr(
            "word/document.xml",
            f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>',
        )
    return output.getvalue()


def test_extracts_supported_chat_attachments_without_saving_them() -> None:
    assert extract_chat_attachment(b"Texto", "nota.txt", "text/plain", settings(), FakeOcr()) == "Texto"
    assert extract_chat_attachment(
        docx_bytes("Caducidad 2030"), "nota.docx", "application/octet-stream", settings(), FakeOcr()
    ) == "Caducidad 2030"
    assert extract_chat_attachment(png_bytes(), "foto.png", "image/png", settings(), FakeOcr()) == "Texto leído localmente"


def test_converts_webp_to_png_for_local_ocr() -> None:
    class PngOcr:
        def read_text(self, data: bytes) -> str:
            assert data.startswith(b"\x89PNG\r\n\x1a\n")
            return "Texto del WebP"

    assert extract_chat_attachment(webp_bytes(), "foto.webp", "image/webp", settings(), PngOcr()) == "Texto del WebP"


def phone_photo(image_format: str, orientation: int) -> bytes:
    """Como la guarda un móvil en vertical: los píxeles apaisados (40×30) y el giro anotado."""
    exif = Image.Exif()
    exif[0x0112] = orientation
    output = BytesIO()
    Image.new("RGB", (40, 30), "white").save(output, format=image_format, exif=exif)
    return output.getvalue()


class SizeOcr:
    def __init__(self) -> None:
        self.size: tuple[int, int] | None = None

    def read_text(self, data: bytes) -> str:
        with Image.open(BytesIO(data)) as image:
            self.size = image.size
        return "Factura"


@pytest.mark.parametrize(
    ("image_format", "mime", "name"),
    [("JPEG", "image/jpeg", "factura.jpg"), ("PNG", "image/png", "factura.png"), ("WEBP", "image/webp", "factura.webp")],
)
def test_the_ocr_reads_a_phone_photo_upright(image_format: str, mime: str, name: str) -> None:
    ocr = SizeOcr()
    assert extract_chat_attachment(phone_photo(image_format, 6), name, mime, settings(), ocr) == "Factura"
    assert ocr.size == (30, 40)


def test_a_photo_without_rotation_reaches_the_ocr_untouched() -> None:
    received: list[bytes] = []

    class RecordingOcr:
        def read_text(self, data: bytes) -> str:
            received.append(data)
            return "Factura"

    photo = phone_photo("JPEG", 1)
    extract_chat_attachment(photo, "factura.jpg", "image/jpeg", settings(), RecordingOcr())
    assert received == [photo]


def test_extracts_pdf_text_and_uses_local_ocr_for_scanned_pages(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.chat_attachments as attachments

    calls = 0

    def run(args, **_kwargs):
        nonlocal calls
        calls += 1
        if args[0] == "pdftotext":
            return SimpleNamespace(returncode=0, stdout=b"Texto del PDF")
        Path(f"{args[-1]}-1.png").write_bytes(png_bytes())
        return SimpleNamespace(returncode=0, stdout=b"")

    monkeypatch.setattr(attachments.subprocess, "run", run)
    ocr = FakeOcr()
    pdf = b"%PDF-1.7 contenido ficticio"

    assert extract_chat_attachment(pdf, "texto.pdf", "application/pdf", settings(), ocr) == "Texto del PDF"
    monkeypatch.setattr(
        attachments.subprocess,
        "run",
        lambda args, **_kwargs: SimpleNamespace(returncode=0, stdout=b"") if args[0] == "pdftotext" else run(args, **_kwargs),
    )
    assert extract_chat_attachment(pdf, "escaneado.pdf", "application/pdf", settings(), ocr) == "Texto leído localmente"
    assert calls >= 2


def test_rejects_unsupported_empty_and_oversized_files() -> None:
    with pytest.raises(ChatAttachmentError, match="unsupported_attachment_type"):
        extract_chat_attachment(b"<html>", "pagina.html", "text/html", settings(), FakeOcr())
    with pytest.raises(ChatAttachmentError, match="empty_attachment"):
        extract_chat_attachment(b"", "empty.txt", "text/plain", settings(), FakeOcr())
    with pytest.raises(ChatAttachmentError, match="attachment_too_large"):
        extract_chat_attachment(b"x" * 100_001, "large.txt", "text/plain", settings(), FakeOcr())


def test_reports_missing_local_ocr_as_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.chat_attachments as attachments

    def unavailable(self, _data: bytes) -> str:
        raise OcrUnavailable

    monkeypatch.setattr(attachments.TesseractOCR, "read_text", unavailable)
    with pytest.raises(ChatAttachmentError, match="attachment_reader_unavailable"):
        extract_chat_attachment(png_bytes(), "foto.png", "image/png", settings(), attachments.TesseractOCR())
