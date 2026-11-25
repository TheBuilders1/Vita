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
