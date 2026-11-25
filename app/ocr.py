from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from datetime import date
from pathlib import Path


_EXPIRY_LABEL = re.compile(
    r"\b(?:caducidad|validez|v[áa]lido\s+hasta|valid\s+until|expiry|expiration|expires)\b",
    re.IGNORECASE,
)
# Con espacios se exige el año completo: «31 12 30» podría ser cualquier número.
_SEPARATOR = r"(?:\s*[-/.]\s*|\s+)"
_DATE_TOKEN = re.compile(
    rf"(?<!\d)(?:\d{{4}}{_SEPARATOR}\d{{1,2}}{_SEPARATOR}\d{{1,2}}"
    rf"|\d{{1,2}}{_SEPARATOR}\d{{1,2}}{_SEPARATOR}\d{{4}}"
    r"|\d{1,2}[-/.]\d{1,2}[-/.]\d{2})(?!\d)"
)
_OTHER_LABEL = re.compile(
    r"nacimiento|birth|expedici[óo]n|emisi[óo]n|issue",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ScanResult:
    status: str
    expires_on: date | None = None

    def as_json(self) -> dict[str, str]:
        result = {"status": self.status}
        if self.expires_on is not None:
            result["expiresOn"] = self.expires_on.isoformat()
        return result


class OcrUnavailable(RuntimeError):
    pass


def _parse_date(value: str) -> date | None:
    first, second, third = re.findall(r"\d+", value)
    if len(first) == 4:
        year, month, day = first, second, third
    else:
        day, month, year = first, second, third
    if len(year) == 2:
        year = f"20{year}"
    try:
        return date(int(year), int(month), int(day))
    except ValueError:
        return None


def _date_tokens(lines: list[str], index: int) -> list[str]:
    """Fechas de la etiqueta o, si va sola, de la línea que tiene debajo."""
    label = lines[index]
    tokens = _DATE_TOKEN.findall(label)
    if tokens or _OTHER_LABEL.search(label):
        return tokens

    following = lines[index + 1] if index + 1 < len(lines) else ""
    if re.search(r"[^\W\d_]", following):
        return []
    return _DATE_TOKEN.findall(following)


def extract_expiry_date(ocr_text: str) -> ScanResult:
    candidates: set[date] = set()
    lines = [line for line in ocr_text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if not _EXPIRY_LABEL.search(line):
            continue
        for token in _date_tokens(lines, index):
            value = _parse_date(token)
            if value is not None:
                candidates.add(value)

    if len(candidates) == 1:
        return ScanResult(status="date_found", expires_on=next(iter(candidates)))
    if len(candidates) > 1:
        return ScanResult(status="date_ambiguous")
    return ScanResult(status="date_missing")


class TesseractOCR:
    def __init__(self, timeout_seconds: int = 20):
        self.timeout_seconds = timeout_seconds

    def read_text(self, data: bytes) -> str:
        try:
            result = subprocess.run(
                [
                    "tesseract",
                    "stdin",
                    "stdout",
                    "-l",
                    "spa+eng",
                    "--psm",
                    "6",
                ],
                input=data,
                capture_output=True,
                timeout=self.timeout_seconds,
                check=False,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as exc:
            raise OcrUnavailable from exc

        if result.returncode != 0:
            raise OcrUnavailable
        return result.stdout.decode("utf-8", errors="replace")

    def scan(self, path: Path) -> ScanResult:
        if path.suffix == ".pdf":
            return self._scan_pdf(path)
        try:
            result = subprocess.run(
                [
                    "tesseract",
                    str(path),
                    "stdout",
                    "-l",
                    "spa+eng",
                    "--psm",
                    "6",
                ],
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                check=False,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as exc:
            raise OcrUnavailable from exc

        if result.returncode != 0:
            raise OcrUnavailable
        return extract_expiry_date(result.stdout)

    def _scan_pdf(self, path: Path) -> ScanResult:
        # El mismo lector que los adjuntos del chat: texto del PDF y, si es escaneado, OCR de sus páginas.
        from app.chat_attachments import ChatAttachmentError, _pdf_text

        try:
            text = _pdf_text(path.read_bytes(), self)
        except ChatAttachmentError as exc:
            if exc.code == "no_text_found":
                return extract_expiry_date("")
            raise OcrUnavailable from exc
        except OSError as exc:
            raise OcrUnavailable from exc
        return extract_expiry_date(text)
