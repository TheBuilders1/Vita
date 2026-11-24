"""Servidor real sobre PostgreSQL para las pruebas de integración.

Se omiten si faltan VITA_TEST_DATABASE_URL y VITA_TEST_MIGRATION_DATABASE_URL.
Vacían las tablas de producto: por eso exigen una base terminada en «_test».
"""

from __future__ import annotations

import os
import socket
import threading
import time
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from datetime import date
from io import BytesIO
from pathlib import Path
from uuid import UUID

import httpx
import psycopg
import pytest
import uvicorn
from PIL import Image

from app.config import Settings
from app.main import create_app
from app.migrate import migrate
from app.ocr import ScanResult

HOME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
TOKENS = {
    "alba-demo-token-change-me": UUID("11111111-1111-4111-8111-111111111111"),
    "bruno-demo-token-change-me": UUID("22222222-2222-4222-8222-222222222222"),
    "carla-demo-token-change-me": UUID("33333333-3333-4333-8333-333333333333"),
}


class FakeOcr:
    def scan(self, path: Path) -> ScanResult:
        return ScanResult("date_found", date(2090, 12, 31))


@dataclass
class FakeGateway:
    """Sustituye a OpenClaw: guarda cada encargo y, si se le pide, lo resuelve."""

    on_run: Callable[[str], None] | None = None
    prompts: list[str] = field(default_factory=list)
    session_keys: list[str] = field(default_factory=list)

    def start_run(self, session_key: str, prompt: str) -> None:
        self.session_keys.append(session_key)
        self.prompts.append(prompt)
        if self.on_run:
            self.on_run(prompt)


@dataclass
class Vita:
    client: httpx.Client
    gateway: FakeGateway
    settings: Settings

    def auth(self, user: str = "alba") -> dict[str, str]:
        return {"Authorization": f"Bearer {user}-demo-token-change-me"}

    def upload(self, user: str = "alba", household: str = HOME) -> httpx.Response:
        output = BytesIO()
        Image.new("RGB", (20, 20), "white").save(output, format="PNG")
        return self.client.post(
            "/v1/documents",
            headers=self.auth(user),
            data={"householdId": household},
            files={"file": ("x.png", output.getvalue(), "image/png")},
        )

    def run(
        self,
        document_id: str | None = None,
        user: str = "alba",
        household: str = HOME,
    ) -> httpx.Response:
        body = {"householdId": household, "message": "prueba"}
        if document_id:
            body["documentId"] = document_id
        return self.client.post("/v1/runs", headers=self.auth(user), json=body)

    def finished(self, run_id: str, timeout: float = 5) -> dict:
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            view = self.client.get(f"/v1/runs/{run_id}", headers=self.auth()).json()
            if view["status"] not in {"queued", "running"}:
                return view
            time.sleep(0.02)
        raise AssertionError("la ejecución no ha terminado")

    def confirm(
        self,
        run_id: str,
        expires_on: str = "2090-12-31",
        days_before: int = 30,
        user: str = "alba",
    ) -> httpx.Response:
        return self.client.post(
            f"/v1/runs/{run_id}/confirm",
            headers=self.auth(user),
            json={"expiresOn": expires_on, "daysBefore": days_before},
        )

    def scan_and_report(self, prompt: str, **outcome: str) -> httpx.Response:
        """Lo que hacen los agentes: escanear y comunicar el resultado."""
        refs = references(prompt)
        result = self.client.post(
            "/v1/internal/scan", headers={"Authorization": f"Bearer {refs['scanRef']}"}
        ).json()
        return self.client.post(
            "/v1/internal/report-result",
            headers={"Authorization": f"Bearer {refs['reportRef']}"},
            json=outcome or result,
        )


def references(prompt: str) -> dict[str, str]:
    import json

    line = next(p for p in prompt.splitlines() if p.startswith("Referencias"))
    return json.loads(line.split(": ", 1)[1])


@pytest.fixture(scope="session")
def test_settings(tmp_path_factory: pytest.TempPathFactory) -> Settings:
    url = os.getenv("VITA_TEST_DATABASE_URL")
    migration_url = os.getenv("VITA_TEST_MIGRATION_DATABASE_URL")
    if not url or not migration_url:
        pytest.skip("faltan VITA_TEST_DATABASE_URL y VITA_TEST_MIGRATION_DATABASE_URL")
    for value in (url, migration_url):
        name = psycopg.conninfo.conninfo_to_dict(value).get("dbname", "")
        if not str(name).endswith("_test"):
            pytest.fail("la base de pruebas debe terminar en «_test»: se vacía")
    settings = Settings(
        database_url=url,
        migration_database_url=migration_url,
        storage_dir=tmp_path_factory.mktemp("private"),
        openclaw_token="test",
        openclaw_timeout_seconds=5,
        demo_tokens=TOKENS,
    )
    migrate(settings)
    return settings


@pytest.fixture
def vita(test_settings: Settings) -> Iterator[Vita]:
    with psycopg.connect(test_settings.database_url) as conn:
        for table in ("reminders", "runs", "documents"):
            conn.execute(f"DELETE FROM producto.{table}")  # noqa: S608

    app = create_app(test_settings)
    gateway = FakeGateway()
    app.state.openclaw_client = gateway
    app.state.ocr = FakeOcr()

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    end = time.monotonic() + 10
    while not server.started:
        assert time.monotonic() < end, "el servidor no arranca"
        time.sleep(0.02)

    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=20) as client:
        yield Vita(client, gateway, test_settings)
    server.should_exit = True
    thread.join(timeout=10)
    assert not thread.is_alive(), "el servidor no se detiene"
