from datetime import date

from app.ocr import extract_expiry_date


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
