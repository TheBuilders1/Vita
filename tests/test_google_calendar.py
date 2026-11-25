from datetime import date
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from cryptography.fernet import Fernet
from pydantic import ValidationError

from app.config import Settings
from app.google_calendar import (
    CALENDAR_EVENTS_URL,
    CALENDAR_SCOPE,
    CalendarIntegrationError,
    _decrypt_refresh_token,
    authorization_url,
    calendar_window,
    exchange_authorization_code,
    encrypt_refresh_token,
    list_calendar_events,
    normalize_calendar_response,
)
from app.schemas import CreateRunBody, run_outcome_adapter


def calendar_settings() -> Settings:
    return Settings(
        google_oauth_client_id="vita-client-id",
        google_oauth_client_secret="vita-client-secret",
        google_oauth_redirect_uri="http://localhost:8000/v1/calendar/oauth/callback",
        google_token_encryption_key=Fernet.generate_key().decode("ascii"),
    )


def test_authorization_url_requests_limited_offline_calendar_scope() -> None:
    url, state, code_verifier, nonce = authorization_url(calendar_settings())
    query = parse_qs(urlsplit(url).query)

    assert query["client_id"] == ["vita-client-id"]
    assert query["redirect_uri"] == [
        "http://localhost:8000/v1/calendar/oauth/callback"
    ]
    assert query["scope"] == [f"openid {CALENDAR_SCOPE}"]
    assert query["scope"][0].startswith("openid ")
    assert query["access_type"] == ["offline"]
    assert query["state"] == [state]
    assert query["nonce"] == [nonce]
    assert query["code_challenge_method"] == ["S256"]
    assert len(query["code_challenge"][0]) >= 43
    assert len(state) >= 32
    assert len(code_verifier) >= 64


def test_oauth_exchange_uses_saved_pkce_verifier_and_only_granted_calendar_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = calendar_settings()
    captured: dict = {}

    def fetch_token(flow, **kwargs) -> None:
        captured["kwargs"] = kwargs
        captured["code_verifier"] = flow.code_verifier
        flow.code_verifier = ""
        flow.oauth2session.token = {
            "access_token": "short-lived-access-token",
            "refresh_token": "google-refresh-secret",
            "scope": f"openid {CALENDAR_SCOPE}",
            "id_token": "verified-id-token",
            "expires_at": 1893456000,
        }

    monkeypatch.setattr("app.google_calendar.Flow.fetch_token", fetch_token)
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: {
            "sub": "google-user-123",
            "nonce": "oauth-nonce",
        },
    )

    refresh_token, google_subject = exchange_authorization_code(
        settings,
        "one-time-code",
        "opaque-state-value-that-is-long-enough-123456789",
        "pkce-verifier-that-was-saved-by-vita-12345678901234567890",
        "oauth-nonce",
    )

    assert refresh_token == "google-refresh-secret"
    assert google_subject == "google-user-123"
    assert captured["code_verifier"].startswith("pkce-verifier")
    assert "one-time-code" not in captured["kwargs"]["authorization_response"]


def test_oauth_exchange_rejects_unapproved_or_missing_calendar_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fetch_token(flow, **_kwargs) -> None:
        flow.code_verifier = ""
        flow.oauth2session.token = {
            "access_token": "short-lived-access-token",
            "refresh_token": "google-refresh-secret",
            "scope": "openid profile",
            "id_token": "verified-id-token",
            "expires_at": 1893456000,
        }

    monkeypatch.setattr("app.google_calendar.Flow.fetch_token", fetch_token)
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: {
            "sub": "google-user-123",
            "nonce": "oauth-nonce",
        },
    )

    with pytest.raises(CalendarIntegrationError, match="scope_not_granted"):
        exchange_authorization_code(
            calendar_settings(),
            "one-time-code",
            "opaque-state-value-that-is-long-enough-123456789",
            "pkce-verifier-that-was-saved-by-vita-12345678901234567890",
            "oauth-nonce",
        )


def test_oauth_exchange_rejects_a_replayed_or_mismatched_nonce(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fetch_token(flow, **_kwargs) -> None:
        flow.code_verifier = ""
        flow.oauth2session.token = {
            "access_token": "short-lived-access-token",
            "refresh_token": "google-refresh-secret",
            "scope": f"openid {CALENDAR_SCOPE}",
            "id_token": "verified-id-token",
            "expires_at": 1893456000,
        }

    monkeypatch.setattr("app.google_calendar.Flow.fetch_token", fetch_token)
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_args, **_kwargs: {
            "sub": "google-user-123",
            "nonce": "nonce-from-another-oauth-attempt",
        },
    )

    with pytest.raises(CalendarIntegrationError, match="identity_invalid"):
        exchange_authorization_code(
            calendar_settings(),
            "one-time-code",
            "opaque-state-value-that-is-long-enough-123456789",
            "pkce-verifier-that-was-saved-by-vita-12345678901234567890",
            "expected-single-use-nonce",
        )


def test_google_oauth_configuration_requires_https_outside_localhost(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_ID", "client")
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_SECRET", "secret")
    monkeypatch.setenv("GOOGLE_OAUTH_REDIRECT_URI", "http://vita.example/callback")
    monkeypatch.setenv(
        "GOOGLE_TOKEN_ENCRYPTION_KEY",
        Fernet.generate_key().decode("ascii"),
    )

    with pytest.raises(ValueError, match="debe usar HTTPS fuera de localhost"):
        Settings.from_env()


def test_refresh_token_is_encrypted_and_key_mismatch_is_rejected() -> None:
    settings = calendar_settings()
    encrypted = encrypt_refresh_token(settings, "google-refresh-secret")

    assert b"google-refresh-secret" not in encrypted
    assert _decrypt_refresh_token(settings, encrypted) == "google-refresh-secret"

    other_settings = calendar_settings()
    with pytest.raises(CalendarIntegrationError, match="credentials_unavailable"):
        _decrypt_refresh_token(other_settings, encrypted)


def test_calendar_window_uses_local_midnight_across_dst() -> None:
    time_min, time_max = calendar_window(
        date(2027, 3, 28),
        date(2027, 3, 28),
        "Europe/Madrid",
    )

    assert time_min == "2027-03-27T23:00:00Z"
    assert time_max == "2027-03-28T22:00:00Z"


def test_calendar_window_rejects_invalid_dates_and_timezones() -> None:
    with pytest.raises(CalendarIntegrationError, match="invalid_calendar_window"):
        calendar_window(date(2027, 3, 29), date(2027, 3, 28), "Europe/Madrid")
    with pytest.raises(CalendarIntegrationError, match="invalid_household_timezone"):
        calendar_window(date(2027, 3, 28), date(2027, 3, 28), "Mars/Olympus")


def test_normalize_calendar_response_returns_only_bounded_event_fields() -> None:
    result = normalize_calendar_response(
        {
            "nextPageToken": "more-events",
            "timeZone": "Europe/Madrid",
            "items": [
                {
                    "summary": "Reunión",
                    "start": {"dateTime": "2027-03-28T09:00:00+02:00"},
                    "end": {"dateTime": "2027-03-28T10:00:00+02:00"},
                    "htmlLink": "https://calendar.google.com/private-link",
                    "attendees": [{"email": "private@example.test"}],
                },
                {
                    "start": {"date": "2027-03-29"},
                    "end": {"date": "2027-03-30"},
                },
            ],
        },
        "Europe/Madrid",
        date(2027, 3, 28),
        date(2027, 3, 28),
    )

    assert result == {
        "status": "calendar_events",
        "events": [
            {
                "summary": "Reunión",
                "start": "2027-03-28T07:00:00Z",
                "end": "2027-03-28T08:00:00Z",
                "allDay": False,
            },
            {
                "summary": "Evento sin título",
                "start": "2027-03-29",
                "end": "2027-03-30",
                "allDay": True,
            },
        ],
        "timeZone": "Europe/Madrid",
        "startDate": "2027-03-28",
        "endDate": "2027-03-28",
        "truncated": True,
    }
    assert "htmlLink" not in str(result)
    assert "private@example.test" not in str(result)


def test_calendar_read_refreshes_credential_and_queries_only_approved_window(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = calendar_settings()
    encrypted = encrypt_refresh_token(settings, "google-refresh-secret")
    captured: dict = {}

    def refresh(credentials, _request) -> None:
        credentials.token = "short-lived-access-token"

    def get(url: str, **kwargs) -> httpx.Response:
        captured["url"] = url
        captured["kwargs"] = kwargs
        return httpx.Response(
            200,
            json={
                "timeZone": "Europe/Madrid",
                "items": [
                    {
                        "summary": "Cita médica",
                        "start": {"dateTime": "2027-03-28T11:00:00+02:00"},
                        "end": {"dateTime": "2027-03-28T11:30:00+02:00"},
                    }
                ]
            },
        )

    monkeypatch.setattr("app.google_calendar.Credentials.refresh", refresh)
    monkeypatch.setattr("app.google_calendar.httpx.get", get)

    result = list_calendar_events(
        settings,
        encrypted,
        date(2027, 3, 28),
        date(2027, 3, 28),
        "Europe/Madrid",
    )

    assert captured["url"] == CALENDAR_EVENTS_URL
    assert captured["kwargs"]["headers"] == {
        "Authorization": "Bearer short-lived-access-token"
    }
    assert captured["kwargs"]["params"]["timeMin"] == "2027-03-27T23:00:00Z"
    assert captured["kwargs"]["params"]["timeMax"] == "2027-03-28T22:00:00Z"
    assert captured["kwargs"]["params"]["maxResults"] == 50
    assert captured["kwargs"]["params"]["fields"] == "timeZone,nextPageToken,items(summary,start,end)"
    assert result["events"][0]["summary"] == "Cita médica"
    assert result["timeZone"] == "Europe/Madrid"


def test_calendar_outcome_is_strict_and_matches_tool_contract() -> None:
    outcome = run_outcome_adapter.validate_python(
        {
            "status": "calendar_events",
            "events": [
                {
                    "summary": "Reunión",
                    "start": "2027-03-28T07:00:00Z",
                    "end": "2027-03-28T08:00:00Z",
                    "allDay": False,
                }
            ],
            "timeZone": "Europe/Madrid",
            "startDate": "2027-03-28",
            "endDate": "2027-03-28",
            "truncated": False,
        }
    )
    assert outcome.model_dump(mode="json", by_alias=True) == {
        "status": "calendar_events",
        "events": [
            {
                "summary": "Reunión",
                "start": "2027-03-28T07:00:00Z",
                "end": "2027-03-28T08:00:00Z",
                "allDay": False,
            }
        ],
        "timeZone": "Europe/Madrid",
        "startDate": "2027-03-28",
        "endDate": "2027-03-28",
        "truncated": False,
    }

    with pytest.raises(ValidationError):
        run_outcome_adapter.validate_python(
            {
                "status": "calendar_events",
                "events": [
                    {
                        "summary": "Reunión",
                        "start": "2027-03-28T07:00:00",
                        "end": "2027-03-28T08:00:00Z",
                        "allDay": False,
                    }
                ],
                "timeZone": "Europe/Madrid",
                "startDate": "2027-03-28",
                "endDate": "2027-03-28",
                "truncated": False,
            }
        )


def test_calendar_run_requires_explicit_bounded_window() -> None:
    body = CreateRunBody.model_validate(
        {
            "message": "¿Qué eventos tengo?",
            "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "calendar": {"startDate": "2027-03-28", "endDate": "2027-03-30"},
        }
    )
    assert body.calendar is not None
    assert body.calendar.start_date == date(2027, 3, 28)

    with pytest.raises(ValidationError):
        CreateRunBody.model_validate(
            {
                "message": "rango demasiado amplio",
                "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "calendar": {
                    "startDate": "2027-03-01",
                    "endDate": "2027-04-01",
                },
            }
        )


def test_openclaw_agent_config_routes_calendar_to_specialized_agent() -> None:
    from pathlib import Path

    project_root = Path(__file__).resolve().parents[1]
    config_text = (project_root / "openclaw/config.example.json5").read_text(
        encoding="utf-8"
    )
    calendar_agent_text = (
        project_root / "openclaw/agents/calendario/AGENTS.md"
    ).read_text(encoding="utf-8")

    assert 'allowAgents: ["documentos", "calendario"]' in config_text
    assert 'allow: ["vita_read_google_calendar"]' in config_text
    assert "calendarRef" in calendar_agent_text
    assert "calendar_agent_failed" in calendar_agent_text
    assert "no crees, edites ni borres eventos" in calendar_agent_text.casefold()

    with pytest.raises(ValidationError):
        CreateRunBody.model_validate(
            {
                "message": "mezcla de tareas",
                "householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "documentId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "calendar": {"startDate": "2027-03-28", "endDate": "2027-03-30"},
            }
        )