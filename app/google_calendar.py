from __future__ import annotations

import secrets
from datetime import date, datetime, time, timezone
from hmac import compare_digest
from urllib.parse import urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from cryptography.fernet import Fernet, InvalidToken
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from app.config import Settings

CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly"
OAUTH_SCOPES = ["openid", CALENDAR_SCOPE]
CALENDAR_EVENTS_URL = (
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
)
MAX_CALENDAR_EVENTS = 50


class CalendarIntegrationError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _require_calendar_settings(settings: Settings) -> None:
    if not settings.google_calendar_enabled:
        raise CalendarIntegrationError("google_calendar_not_configured")


def _oauth_flow(
    settings: Settings,
    state: str | None = None,
    code_verifier: str | None = None,
) -> Flow:
    _require_calendar_settings(settings)
    client_config = {
        "web": {
            "client_id": settings.google_oauth_client_id,
            "client_secret": settings.google_oauth_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_oauth_redirect_uri],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=OAUTH_SCOPES,
        state=state,
        redirect_uri=settings.google_oauth_redirect_uri,
        code_verifier=code_verifier,
        autogenerate_code_verifier=False,
    )


def authorization_url(settings: Settings) -> tuple[str, str, str, str]:
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    flow = _oauth_flow(settings, code_verifier=code_verifier)
    url, state = flow.authorization_url(
        access_type="offline",
        state=state,
        nonce=nonce,
    )
    return url, state, code_verifier, nonce


def exchange_authorization_code(
    settings: Settings,
    code: str,
    state: str,
    code_verifier: str,
    expected_nonce: str,
) -> tuple[str | None, str]:
    flow = _oauth_flow(settings, state=state, code_verifier=code_verifier)
    callback_url = urlunsplit(
        urlsplit(settings.google_oauth_redirect_uri)._replace(
            query=urlencode({"state": state})
        )
    )
    try:
        flow.fetch_token(
            code=code,
            authorization_response=callback_url,
        )
    except Exception as exc:
        # OAuth library errors can contain the authorization code or token response.
        raise CalendarIntegrationError("google_oauth_exchange_failed") from exc

    credentials = flow.credentials
    granted = credentials.granted_scopes
    granted_scopes = (
        set(granted.split())
        if isinstance(granted, str)
        else set(granted or [])
    )
    if granted_scopes and CALENDAR_SCOPE not in granted_scopes:
        raise CalendarIntegrationError("google_calendar_scope_not_granted")
    id_token = credentials.id_token
    if not isinstance(id_token, str):
        raise CalendarIntegrationError("google_calendar_identity_unavailable")
    try:
        from google.oauth2 import id_token as google_id_token

        claims = google_id_token.verify_oauth2_token(
            id_token,
            GoogleAuthRequest(),
            audience=settings.google_oauth_client_id,
        )
    except Exception as exc:
        raise CalendarIntegrationError("google_calendar_identity_invalid") from exc
    nonce = claims.get("nonce")
    if not isinstance(nonce, str) or not compare_digest(
        nonce,
        expected_nonce,
    ):
        raise CalendarIntegrationError("google_calendar_identity_invalid")
    google_subject = claims.get("sub")
    if not isinstance(google_subject, str) or not google_subject:
        raise CalendarIntegrationError("google_calendar_identity_unavailable")
    if not granted_scopes:
        granted_scopes = set(flow.oauth2session.scope or [])
    if CALENDAR_SCOPE not in granted_scopes:
        raise CalendarIntegrationError("google_calendar_scope_not_granted")
    if not credentials.refresh_token:
        # Existing connections may reauthorize without receiving a new refresh token.
        return None, google_subject
    return credentials.refresh_token, google_subject


def encrypt_refresh_token(settings: Settings, refresh_token: str) -> bytes:
    _require_calendar_settings(settings)
    try:
        return Fernet(settings.google_token_encryption_key.encode("ascii")).encrypt(
            refresh_token.encode("utf-8")
        )
    except (ValueError, UnicodeEncodeError) as exc:
        raise CalendarIntegrationError("google_calendar_credentials_unavailable") from exc


def encrypt_oauth_secret(settings: Settings, secret: str) -> bytes:
    return encrypt_refresh_token(settings, secret)


def decrypt_oauth_secret(settings: Settings, ciphertext: bytes) -> str:
    return _decrypt_refresh_token(settings, ciphertext)


def _decrypt_refresh_token(settings: Settings, encrypted_token: bytes) -> str:
    _require_calendar_settings(settings)
    try:
        token = Fernet(settings.google_token_encryption_key.encode("ascii")).decrypt(
            encrypted_token
        )
        return token.decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, ValueError, UnicodeEncodeError) as exc:
        raise CalendarIntegrationError("google_calendar_credentials_unavailable") from exc


def calendar_window(
    start_date: date,
    end_date: date,
    timezone_name: str,
) -> tuple[str, str]:
    if end_date < start_date:
        raise CalendarIntegrationError("invalid_calendar_window")
    if end_date == date.max:
        raise CalendarIntegrationError("invalid_calendar_window")
    try:
        zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise CalendarIntegrationError("invalid_household_timezone") from exc

    start = datetime.combine(start_date, time.min, tzinfo=zone)
    end_date_exclusive = date.fromordinal(end_date.toordinal() + 1)
    end = datetime.combine(end_date_exclusive, time.min, tzinfo=zone)
    start_utc = start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    end_utc = end.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return start_utc, end_utc


def _event_datetime(value: object) -> tuple[str, bool] | None:
    if not isinstance(value, dict):
        return None
    date_time_value = value.get("dateTime")
    if isinstance(date_time_value, str):
        normalized = (
            date_time_value[:-1] + "+00:00"
            if date_time_value.endswith("Z")
            else date_time_value
        )
        try:
            parsed = datetime.fromisoformat(normalized)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return None
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"), False

    date_value = value.get("date")
    if isinstance(date_value, str):
        try:
            return date.fromisoformat(date_value).isoformat(), True
        except ValueError:
            return None
    return None


def normalize_calendar_response(
    response: object,
    timezone_name: str,
    start_date: date,
    end_date: date,
) -> dict:
    if not isinstance(response, dict) or not isinstance(response.get("items", []), list):
        raise CalendarIntegrationError("invalid_calendar_response")
    if response.get("timeZone") != timezone_name:
        raise CalendarIntegrationError("calendar_timezone_mismatch")

    items = response.get("items", [])
    events = []
    for item in items[:MAX_CALENDAR_EVENTS]:
        if not isinstance(item, dict):
            continue
        start = _event_datetime(item.get("start"))
        end = _event_datetime(item.get("end"))
        if start is None or end is None or start[1] != end[1]:
            continue
        summary = item.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            summary = "Evento sin título"
        events.append(
            {
                "summary": summary.strip()[:250],
                "start": start[0],
                "end": end[0],
                "allDay": start[1],
            }
        )

    return {
        "status": "calendar_events",
        "events": events,
        "timeZone": timezone_name,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "truncated": bool(response.get("nextPageToken")) or len(items) > MAX_CALENDAR_EVENTS,
    }


def list_calendar_events(
    settings: Settings,
    encrypted_refresh_token: bytes,
    start_date: date,
    end_date: date,
    timezone_name: str,
) -> dict:
    refresh_token = _decrypt_refresh_token(settings, encrypted_refresh_token)
    time_min, time_max = calendar_window(start_date, end_date, timezone_name)
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_oauth_client_id,
        client_secret=settings.google_oauth_client_secret,
        scopes=[CALENDAR_SCOPE],
    )
    try:
        credentials.refresh(GoogleAuthRequest())
        response = httpx.get(
            CALENDAR_EVENTS_URL,
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "timeZone": timezone_name,
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": MAX_CALENDAR_EVENTS,
                "fields": "timeZone,nextPageToken,items(summary,start,end)",
            },
            headers={"Authorization": f"Bearer {credentials.token}"},
            timeout=20,
            trust_env=False,
        )
    except GoogleAuthError as exc:
        raise CalendarIntegrationError("google_calendar_authorization_failed") from exc
    except httpx.TimeoutException as exc:
        raise CalendarIntegrationError("google_calendar_timeout") from exc
    except httpx.HTTPError as exc:
        raise CalendarIntegrationError("google_calendar_unavailable") from exc
    except Exception as exc:
        # Transport implementations may expose RefreshError/TransportError types.
        raise CalendarIntegrationError("google_calendar_authorization_failed") from exc

    if not response.is_success:
        raise CalendarIntegrationError("google_calendar_api_error")
    try:
        payload = response.json()
    except ValueError as exc:
        raise CalendarIntegrationError("invalid_calendar_response") from exc
    return normalize_calendar_response(payload, timezone_name, start_date, end_date)