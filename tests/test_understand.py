import json
from datetime import date
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.openclaw import GatewayTimeout
from app.understand import BillFields, DocumentFields, UnreadableAnswer, parse_understood

TOKEN = "alba-demo-token-for-reading"
ALBA = UUID("11111111-1111-4111-8111-111111111111")
BILL = {
    "type": "bill", "concept": "Factura de la luz · Iberdrola", "supplier": "Iberdrola",
    "amountCents": 6342, "date": "2026-11-03", "dueDate": "2026-11-20", "category": "home",
}


def test_reads_a_bill_and_a_document() -> None:
    bill = parse_understood(json.dumps(BILL))
    assert isinstance(bill, BillFields)
    assert (bill.amount_cents, bill.bill_date, bill.due_date) == (6342, date(2026, 11, 3), date(2026, 11, 20))
    dni = parse_understood('```json\n{"type":"document","kind":"id","title":"DNI de Marta López",'
                           '"holderName":"Marta López","issueDate":null,"expiryDate":"2031-04-30"}\n```')
    assert isinstance(dni, DocumentFields)
    assert (dni.kind, dni.holder_name, dni.expiry_date) == ("id", "Marta López", date(2031, 4, 30))


@pytest.mark.parametrize(
    "answer",
    [
        "La factura es de 63,42 €.",
        json.dumps({**BILL, "iban": "ES00 0000"}),
        json.dumps({**BILL, "category": "vacaciones"}),
        json.dumps({**BILL, "date": "3 de noviembre"}),
        json.dumps({**BILL, "amountCents": -5}),
        json.dumps({"type": "document", "kind": "id", "title": ""}),
        json.dumps({"type": "receta"}),
    ],
)
def test_anything_but_the_requested_json_is_discarded(answer: str) -> None:
    with pytest.raises(UnreadableAnswer):
        parse_understood(answer)


class FakeGateway:
    def __init__(self, answer: str | Exception) -> None:
        self.answer = answer
        self.calls: list[tuple[str, str, str]] = []

    def understand(self, request_key: str, hint: str, text: str) -> str:
        self.calls.append((request_key, hint, text))
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


def client(answer: str | Exception) -> tuple[TestClient, FakeGateway]:
    app = create_app(Settings(openclaw_token="secret", demo_tokens={TOKEN: ALBA}))
    gateway = FakeGateway(answer)
    app.state.openclaw_client = gateway
    return TestClient(app), gateway


def read(test: TestClient, kind: str = "bill", text: bytes = b"IBERDROLA Total a pagar 63,42 EUR"):
    return test.post(
        "/v1/documents/understand",
        headers={"Authorization": f"Bearer {TOKEN}"},
        data={"kind": kind},
        files={"file": ("factura.txt", text, "text/plain")},
    )


def test_the_model_receives_only_the_text_and_the_page_gets_the_fields() -> None:
    test, gateway = client(json.dumps(BILL))
    response = read(test)
    assert response.status_code == 200
    assert response.json() == BILL
    [(key, hint, text)] = gateway.calls
    assert key.startswith(f"vita:{ALBA}:understand:") and hint == "bill"
    assert "63,42" in text


@pytest.mark.parametrize(
    ("answer", "status", "detail"),
    [
        ("No sé qué es esto", 502, "unreadable_answer"),
        (GatewayTimeout(), 504, "assistant_timeout"),
    ],
)
def test_failures_say_what_happened(answer, status: int, detail: str) -> None:
    test, _ = client(answer)
    response = read(test)
    assert (response.status_code, response.json()["detail"]) == (status, detail)


def test_requires_a_token_and_a_known_hint() -> None:
    test, gateway = client(json.dumps(BILL))
    assert test.post("/v1/documents/understand", files={"file": ("a.txt", b"x", "text/plain")}).status_code == 401
    assert read(test, kind="receta").status_code == 422
    assert gateway.calls == []
