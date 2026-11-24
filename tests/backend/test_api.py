import threading
import time

import httpx
import psycopg
import pytest

from conftest import Vita

OTHER_HOME = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"


def reminders(vita: Vita) -> int:
    with psycopg.connect(vita.settings.database_url) as conn:
        return conn.execute("SELECT count(*) FROM producto.reminders").fetchone()[0]


def scanned(vita: Vita, document_id: str) -> str:
    """Ejecución completa: el agente escanea y comunica lo que dice el OCR."""
    vita.gateway.on_run = lambda prompt: vita.scan_and_report(prompt)
    run_id = vita.run(document_id).json()["runId"]
    assert vita.finished(run_id)["status"] == "completed"
    return run_id


def test_scan_confirm_flow_is_idempotent(vita: Vita) -> None:
    run_id = scanned(vita, vita.upload().json()["documentId"])
    first = vita.confirm(run_id)
    again = vita.confirm(run_id)

    assert first.status_code == 200
    assert again.json() == first.json()
    assert vita.confirm(run_id, "2091-01-01").json()["detail"] == "confirmation_conflict"
    assert reminders(vita) == 1


def test_session_belongs_to_the_configured_agent(vita: Vita) -> None:
    """Con varios agentes, OpenClaw rechaza las claves que no dicen de cuál son."""
    run_id = scanned(vita, vita.upload().json()["documentId"])

    assert vita.gateway.session_keys == [f"agent:orquestador:vita:run:{run_id}"]


def test_other_people_see_nothing(vita: Vita) -> None:
    document_id = vita.upload().json()["documentId"]
    run_id = scanned(vita, document_id)

    for user in ("bruno", "carla"):
        response = vita.client.get(f"/v1/runs/{run_id}", headers=vita.auth(user))
        assert response.status_code == 404
        assert vita.confirm(run_id, user=user).status_code == 404
    assert vita.run(document_id, user="bruno").status_code == 404
    assert vita.run(user="alba", household=OTHER_HOME).status_code == 403
    assert vita.upload(household=OTHER_HOME).status_code == 403


def test_agent_cannot_change_the_scanned_date(vita: Vita) -> None:
    vita.gateway.on_run = lambda prompt: vita.scan_and_report(
        prompt, status="date_found", expiresOn="2099-01-01"
    )
    run_id = vita.run(vita.upload().json()["documentId"]).json()["runId"]

    view = vita.finished(run_id)
    assert (view["status"], view["errorCode"]) == ("failed", "invalid_result")


def test_silent_agent_times_out(vita: Vita) -> None:
    run_id = vita.run().json()["runId"]

    view = vita.finished(run_id, timeout=10)
    assert (view["status"], view["errorCode"]) == ("timed_out", "report_timeout")


def test_rescanning_a_confirmed_document_does_not_reopen_it(vita: Vita) -> None:
    document_id = vita.upload().json()["documentId"]
    assert vita.confirm(scanned(vita, document_id)).status_code == 200

    second = vita.confirm(scanned(vita, document_id), "2095-05-05")

    assert second.status_code == 409
    assert second.json()["detail"] == "document_not_confirmable"
    assert reminders(vita) == 1


def test_run_in_flight_does_not_reopen_a_document_confirmed_meanwhile(vita: Vita) -> None:
    document_id = vita.upload().json()["documentId"]
    first = scanned(vita, document_id)
    vita.gateway.on_run = None
    second = vita.run(document_id).json()["runId"]
    end = time.monotonic() + 3
    while len(vita.gateway.prompts) < 2 and time.monotonic() < end:
        time.sleep(0.02)
    assert vita.confirm(first).status_code == 200

    vita.scan_and_report(vita.gateway.prompts[1])

    assert vita.finished(second)["status"] == "completed"
    assert vita.confirm(second, "2095-05-05").status_code == 409
    assert reminders(vita) == 1


@pytest.mark.parametrize("expires_on", ["0001-01-01", "0001-01-31", "2020-01-01"])
def test_dates_far_in_the_past_are_rejected_as_past(vita: Vita, expires_on: str) -> None:
    run_id = scanned(vita, vita.upload().json()["documentId"])

    response = vita.confirm(run_id, expires_on, days_before=365)

    assert response.status_code == 409
    assert response.json()["detail"] == "reminder_would_be_in_past"


def test_waiting_runs_do_not_block_the_api(vita: Vita) -> None:
    """Cada ejecución espera al agente; las demás peticiones no deben esperar con ella."""
    def create() -> None:
        with httpx.Client(base_url=vita.client.base_url, timeout=20) as client:
            client.post(
                "/v1/runs",
                headers=vita.auth(),
                json={"householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "message": "x"},
            )

    threads = [threading.Thread(target=create) for _ in range(45)]
    for thread in threads:
        thread.start()
    time.sleep(1)
    start = time.monotonic()
    assert vita.client.get("/healthz").status_code == 200
    elapsed = time.monotonic() - start
    for thread in threads:
        thread.join()
    assert elapsed < 1
