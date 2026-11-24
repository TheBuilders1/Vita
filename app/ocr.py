from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path


_EXPIRY_LABEL = re.compile(
    r"\b(?:caducidad|validez|v[áa]lido\s+hasta|valid\s+until|expiry|expiration|expires)\b",
    re.IGNORECASE,
)
_DATE_TOKEN = re.compile(
    r"(?<!\d)(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})(?!\d)"
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
    try:
        parts = re.split(r"[-/.]", value)
        if len(parts[0]) == 4:
            return date.fromisoformat(
                f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
            )
        return datetime.strptime(value.replace(".", "/").replace("-", "/"), "%d/%m/%Y").date()
    except (ValueError, IndexError):
        return None


def extract_expiry_date(ocr_text: str) -> ScanResult:
    candidates: set[date] = set()
    for line in ocr_text.splitlines():
        if not _EXPIRY_LABEL.search(line):
            continue
        for match in _DATE_TOKEN.finditer(line):
            value = _parse_date(match.group(0))
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

    def scan(self, path: Path) -> ScanResult:
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
