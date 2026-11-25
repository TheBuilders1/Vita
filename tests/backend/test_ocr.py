import shutil
import sys
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.ocr import TesseractOCR, extract_expiry_date


def test_uses_expiry_label_not_other_dates() -> None:
    result = extract_expiry_date(
        """
        FECHA DE NACIMIENTO: 01/02/1990
        FECHA DE EXPEDICION: 01/02/2020
        FECHA DE CADUCIDAD: 31/12/2030
        """
    )

    assert result.status == "date_found"
    assert result.expires_on == date(2030, 12, 31)


def test_multiple_expiry_dates_are_ambiguous() -> None:
    result = extract_expiry_date(
        "CADUCIDAD: 31/12/2030\nVALID UNTIL: 2031-01-01"
    )

    assert result.status == "date_ambiguous"
    assert result.expires_on is None


def test_missing_or_invalid_expiry_date_is_not_guessed() -> None:
    assert extract_expiry_date("EXPEDICION: 2030-12-31").status == "date_missing"
    assert extract_expiry_date("CADUCIDAD: 31/02/2030").status == "date_missing"


def test_read_text_runs_tesseract_on_image_bytes(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = {}

    def run(arguments, **options):
        captured["arguments"] = arguments
        captured["options"] = options
        return SimpleNamespace(returncode=0, stdout=b"Texto local")

    monkeypatch.setattr("app.ocr.subprocess.run", run)

    assert TesseractOCR().read_text(b"imagen") == "Texto local"
    assert captured["arguments"][:3] == ["tesseract", "stdin", "stdout"]
    assert captured["options"]["input"] == b"imagen"


@pytest.mark.parametrize(
    "text",
    [
        "FECHA DE CADUCIDAD: 31 12 2030",
        "CADUCIDAD: 31 / 12 / 2030",
        "CADUCIDAD: 31/12/30",
        "CADUCIDAD: 31.12.30",
        "VALIDEZ 2030 12 31",
        "CADUCIDAD\n31/12/2030",
        "CADUCIDAD:\n\n  31 12 2030  ",
    ],
)
def test_common_spanish_formats(text: str) -> None:
    result = extract_expiry_date(text)

    assert result.status == "date_found"
    assert result.expires_on == date(2030, 12, 31)


@pytest.mark.parametrize(
    "text",
    [
        # La línea siguiente pertenece a otro dato.
        "CADUCIDAD\nFECHA DE EXPEDICION: 01/02/2020",
        # Cabecera de dos columnas: no se sabe de cuál es la única fecha leída.
        "EXPEDICION   VALIDEZ\n01 02 2020",
        "EMISIÓN / VALIDEZ\n01 02 2020",
        # La fecha de la etiqueta está mal leída: no se sustituye por otra.
        "CADUCIDAD: 31/02/2030\n01/01/2031",
        "CADUCIDAD\n\nTexto\n31/12/2030",
        "CADUCIDAD",
        # Con espacios y año corto podría ser cualquier número.
        "CADUCIDAD 31 12 30",
        "CADUCIDAD 131/12/2030",
    ],
)
def test_doubtful_dates_are_not_guessed(text: str) -> None:
    assert extract_expiry_date(text).status == "date_missing"


def test_two_columns_of_dates_are_ambiguous() -> None:
    text = "EXPEDICION   VALIDEZ\n01 02 2020   01 02 2030"

    assert extract_expiry_date(text).status in {"date_ambiguous", "date_missing"}
    assert extract_expiry_date("CADUCIDAD\n01 02 2020 01 02 2030").status == "date_ambiguous"


@pytest.mark.skipif(shutil.which("tesseract") is None, reason="Tesseract no está instalado")
def test_demo_sample_is_readable(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(Path(__file__).parents[2] / "scripts"))
    sys.modules.pop("make_demo_sample", None)
    import make_demo_sample

    make_demo_sample.main()

    result = TesseractOCR().scan(tmp_path / "vita-demo-document.png")
    assert result.expires_on == date(2030, 12, 31)
