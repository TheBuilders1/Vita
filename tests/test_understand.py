import json
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.openclaw import GatewayTimeout
from app.understand import InvalidCatalog, UnreadableAnswer, parse_catalog, parse_understood

TOKEN = "alba-demo-token-for-reading"
ALBA = UUID("11111111-1111-4111-8111-111111111111")
CATALOG = [
    {"typeId": "transaction", "name": "Gasto o ingreso", "fields": {
        "concept": {"kind": "text", "label": "Concepto", "required": True},
        "amount": {"kind": "money", "label": "Importe", "required": True},
        "category": {"kind": "select", "label": "Categoría", "options": ["home", "food"]},
        "date": {"kind": "date", "label": "Fecha"},
    }},
    {"typeId": "recipe", "name": "Receta", "fields": {
        "name": {"kind": "text", "label": "Nombre", "required": True},
        "ingredients": {"kind": "ingredients", "label": "Ingredientes"},
    }},
]
BILL = {"typeId": "transaction", "data": {"concept": "Factura · Logística", "amount": 153806, "category": "home", "date": "2024-04-17"}}


def test_reads_any_kind_of_record_from_the_catalog() -> None:
    catalog = parse_catalog(json.dumps(CATALOG))
    assert parse_understood(json.dumps(BILL), catalog).model_dump(by_alias=True) == BILL
    recipe = parse_understood(
        '```json\n{"typeId":"recipe","data":{"name":"Lentejas","ingredients":[{"name":"lentejas","quantity":300,"unit":"g"}],"date":null}}\n```',
        {**catalog},
    )
    assert recipe.type_id == "recipe" and recipe.data["ingredients"][0]["name"] == "lentejas"


@pytest.mark.parametrize(
    "answer",
    [
        "La factura es de 1.538,06 €.",
        json.dumps({"typeId": "vacaciones", "data": {}}),
        json.dumps({"typeId": "transaction", "data": {"iban": "ES00 0000"}}),
        'Es una factura.\n{"typeId":"transaction","data":{"iban":"ES00 0000"}}',
        f"Es una factura.\n{json.dumps(BILL)}\n{json.dumps(BILL)}",
        json.dumps({"typeId": "transaction", "data": {"concept": {"a": {"b": 1}}}}),
        json.dumps({"typeId": "transaction", "data": {}, "extra": True}),
    ],
)
def test_anything_outside_the_catalog_is_discarded(answer: str) -> None:
    with pytest.raises(UnreadableAnswer):
        parse_understood(answer, parse_catalog(json.dumps(CATALOG)))


@pytest.mark.parametrize(
    "raw",
    ["", "no es json", "[]", json.dumps([{"typeId": "../x", "name": "x", "fields": {}}]),
     json.dumps([{"typeId": "a", "name": "x", "fields": {"b": {"kind": "script", "label": "x"}}}]),
     json.dumps(CATALOG * 50)],
)
def test_a_bad_catalog_is_refused(raw: str) -> None:
    with pytest.raises(InvalidCatalog):
        parse_catalog(raw)


class FakeGateway:
    def __init__(self, answer: str | Exception) -> None:
        self.answer = answer
        self.calls: list[tuple[str, str, str, list[str]]] = []

    def understand(self, request_key: str, hint: str, text: str, catalog: dict) -> str:
        self.calls.append((request_key, hint, text, list(catalog)))
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


def client(answer: str | Exception) -> tuple[TestClient, FakeGateway]:
    app = create_app(Settings(openclaw_token="secret", demo_tokens={TOKEN: ALBA}))
    gateway = FakeGateway(answer)
    app.state.openclaw_client = gateway
    return TestClient(app), gateway


def read(test: TestClient, kind: str = "bill", catalog: str | None = None):
    return test.post(
        "/v1/documents/understand",
        headers={"Authorization": f"Bearer {TOKEN}"},
        data={"kind": kind, "catalog": json.dumps(CATALOG) if catalog is None else catalog},
        files={"file": ("factura.txt", b"Empresa de logistica Total 1.538,06 EUR", "text/plain")},
    )


@pytest.mark.parametrize("answer", [
    json.dumps(BILL),
    f"He encontrado el importe y la fecha.\n\n{json.dumps(BILL, indent=2)}",
    f"He encontrado el importe y la fecha.\n\n```json\n{json.dumps(BILL)}\n```",
])
def test_the_model_gets_text_and_catalog_and_the_page_gets_the_record(answer: str) -> None:
    test, gateway = client(answer)
    response = read(test)
    assert response.status_code == 200
    assert response.json() == BILL
    [(key, hint, text, types)] = gateway.calls
    assert key.startswith(f"vita:{ALBA}:understand:") and hint == "bill"
    assert "1.538,06" in text and types == ["transaction", "recipe"]


@pytest.mark.parametrize(
    ("answer", "status", "detail"),
    [("No sé qué es esto", 502, "unreadable_answer"), (GatewayTimeout(), 504, "assistant_timeout")],
)
def test_failures_say_what_happened(answer, status: int, detail: str) -> None:
    test, _ = client(answer)
    response = read(test)
    assert (response.status_code, response.json()["detail"]) == (status, detail)


def test_requires_a_token_a_known_hint_and_a_catalog() -> None:
    test, gateway = client(json.dumps(BILL))
    assert test.post("/v1/documents/understand", files={"file": ("a.txt", b"x", "text/plain")}).status_code == 401
    assert read(test, kind="receta").status_code == 422
    assert read(test, catalog="[]").json()["detail"] == "invalid_catalog"
    assert gateway.calls == []
