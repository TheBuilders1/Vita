from __future__ import annotations

import json
import logging
import os
import secrets
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import ValidationError

from app.config import Settings
from app.database import connect, recover_interrupted_runs
from app.google_calendar import (
    CalendarIntegrationError,
    authorization_url,
    decrypt_oauth_secret,
    encrypt_oauth_secret,
    encrypt_refresh_token,
    exchange_authorization_code,
    list_calendar_events,
)
from app.images import ImageRejected, inspect_image
from app.ocr import OcrUnavailable, TesseractOCR
from app.openclaw import OpenClawClient
from app.reminders import ReminderInPast, scheduled_reminder_at
from app.schemas import (
    ConfirmationAccepted,
    ConfirmBody,
    CreateRunBody,
    DocumentAccepted,
    RunAccepted,
    RunView,
    run_outcome_adapter,
)
from app.security import authenticated_user, bearer_token, token_digest
from app.worker import (
    RunSignals,
    claim_scan,
    consume_calendar_ref,
    dispatch_run,
    fail_calendar_run,
    fail_invalid_report,
    finish_if_active,
    report_result,
    store_calendar_result,
    store_scan_result,
)

logger = logging.getLogger(__name__)
REPORT_BODY_LIMIT = 65_536


def _save_private_file(root: Path, data: bytes, extension: str) -> tuple[str, Path]:
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    storage_key = f"{uuid4().hex}.{extension}"
    path = root / storage_key
    descriptor = os.open(
        path,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        0o600,
    )
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(data)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return storage_key, path


def _confirm_response(
    run_id: UUID,
    document_id: UUID,
    reminder: dict,
) -> ConfirmationAccepted:
    return ConfirmationAccepted(
        reminderId=reminder["id"],
        runId=run_id,
        documentId=document_id,
        expiresOn=reminder["expires_on"],
        scheduledAt=reminder["notify_at"].isoformat(),
        status="scheduled",
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        config.storage_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        recover_interrupted_runs(config)
        yield

    api = FastAPI(
        title="Vita API",
        version="0.1.0",
        lifespan=lifespan,
    )
    api.state.settings = config
    api.state.connect = lambda: connect(config)
    api.state.signals = RunSignals()
    api.state.openclaw_client = OpenClawClient(config)
    api.state.ocr = TesseractOCR()

    @api.post("/v1/calendar/connect")
    def connect_google_calendar(
        request: Request,
        user_id: UUID = Depends(authenticated_user),
    ) -> dict[str, str | int]:
        settings = request.app.state.settings
        try:
            url, state, code_verifier, nonce = authorization_url(settings)
        except CalendarIntegrationError as exc:
            raise HTTPException(status_code=503, detail=exc.code) from exc

        with request.app.state.connect() as conn:
            conn.execute(
                "DELETE FROM producto.google_oauth_states WHERE expires_at <= now()"
            )
            pending_oauth = conn.execute(
                """
                SELECT count(*) AS count
                FROM producto.google_oauth_states
                WHERE owner_user_id = %s AND expires_at > now()
                """,
                (user_id,),
            ).fetchone()
            if pending_oauth["count"] >= 5:
                raise HTTPException(status_code=429, detail="too_many_google_oauth_requests")
            encrypted_verifier = encrypt_oauth_secret(settings, code_verifier)
            conn.execute(
                """
                INSERT INTO producto.google_oauth_states (
                    state_hash, owner_user_id, code_verifier_ciphertext,
                    nonce_hash, expires_at
                )
                VALUES (%s, %s, %s, %s, now() + interval '10 minutes')
                """,
                (
                    token_digest(state),
                    user_id,
                    encrypted_verifier,
                    token_digest(nonce),
                ),
            )
        return {"authorizationUrl": url, "expiresIn": 600}

    @api.get("/v1/calendar/oauth/callback", include_in_schema=False)
    def google_calendar_oauth_callback(
        request: Request,
        state: str,
        code: str | None = Query(default=None, max_length=2048),
        error: str | None = Query(default=None, max_length=256),
    ) -> RedirectResponse:
        if (
            len(state) < 32
            or len(state) > 256
            or not state.isascii()
            or any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for char in state)
        ):
            raise HTTPException(status_code=400, detail="invalid_oauth_state")

        with request.app.state.connect() as conn:
            oauth_state = conn.execute(
                """
                DELETE FROM producto.google_oauth_states
                WHERE state_hash = %s AND expires_at > now()
                RETURNING owner_user_id, code_verifier_ciphertext, nonce_hash
                """,
                (token_digest(state),),
            ).fetchone()
        if not oauth_state:
            raise HTTPException(status_code=400, detail="invalid_or_expired_oauth_state")
        if error or not code:
            raise HTTPException(status_code=400, detail="google_calendar_authorization_denied")

        settings = request.app.state.settings
        try:
            refresh_token, google_subject = exchange_authorization_code(
                settings,
                code,
                state,
                decrypt_oauth_secret(settings, oauth_state["code_verifier_ciphertext"]),
                oauth_state["nonce_hash"],
            )
        except CalendarIntegrationError as exc:
            raise HTTPException(status_code=400, detail=exc.code) from exc
        if not refresh_token:
            with request.app.state.connect() as conn:
                existing = conn.execute(
                    """
                    SELECT google_subject
                    FROM producto.google_calendar_connections
                    WHERE owner_user_id = %s
                    """,
                    (oauth_state["owner_user_id"],),
                ).fetchone()
            if not existing:
                raise HTTPException(
                    status_code=400,
                    detail="google_calendar_refresh_token_missing",
                )
            if existing["google_subject"] != google_subject:
                raise HTTPException(
                    status_code=409,
                    detail="google_calendar_account_mismatch",
                )

        owner_user_id = oauth_state["owner_user_id"]
        if refresh_token:
            encrypted = encrypt_refresh_token(settings, refresh_token)
            with request.app.state.connect() as conn:
                conn.execute(
                    """
                    INSERT INTO producto.google_calendar_connections (
                        owner_user_id, google_subject, refresh_token_ciphertext
                    )
                    VALUES (%s, %s, %s)
                    ON CONFLICT (owner_user_id) DO UPDATE
                    SET google_subject = EXCLUDED.google_subject,
                        refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
                        updated_at = now()
                    """,
                    (owner_user_id, google_subject, encrypted),
                )
        return RedirectResponse(url="/v1/calendar/oauth/complete", status_code=303)

    @api.get(
        "/v1/calendar/oauth/complete",
        include_in_schema=False,
        response_class=HTMLResponse,
    )
    def google_calendar_oauth_complete() -> str:
        return (
            "<!doctype html><html lang='es'><meta charset='utf-8'>"
            "<title>Google Calendar conectado</title>"
            "<body><p>Google Calendar quedó conectado. Ya puedes cerrar esta ventana.</p>"
            "</body></html>"
        )

    @api.get("/v1/calendar/status")
    def google_calendar_status(
        request: Request,
        user_id: UUID = Depends(authenticated_user),
    ) -> dict[str, bool]:
        with request.app.state.connect() as conn:
            connection = conn.execute(
                """
                SELECT 1
                FROM producto.google_calendar_connections
                WHERE owner_user_id = %s
                """,
                (user_id,),
            ).fetchone()
        return {"connected": connection is not None}

    @api.delete("/v1/calendar/connection")
    def disconnect_google_calendar(
        request: Request,
        user_id: UUID = Depends(authenticated_user),
    ) -> dict[str, bool]:
        with request.app.state.connect() as conn:
            conn.execute(
                """
                DELETE FROM producto.google_calendar_connections
                WHERE owner_user_id = %s
                """,
                (user_id,),
            )
            conn.execute(
                """
                DELETE FROM producto.google_oauth_states
                WHERE owner_user_id = %s
                """,
                (user_id,),
            )
            cancelled_runs = conn.execute(
                """
                UPDATE producto.runs
                SET status = 'failed',
                    error_code = 'calendar_disconnected',
                    finished_at = now(),
                    report_ref_hash = NULL,
                    scan_ref_hash = NULL,
                    calendar_ref_hash = NULL
                WHERE owner_user_id = %s
                  AND status IN ('queued', 'running')
                  AND calendar_start_date IS NOT NULL
                RETURNING id
                """,
                (user_id,),
            ).fetchall()
        for cancelled_run in cancelled_runs:
            request.app.state.signals.notify(cancelled_run["id"])
        return {"connected": False}

    @api.get("/healthz", include_in_schema=False)
    def healthz(request: Request) -> dict[str, str]:
        with request.app.state.connect() as conn:
            conn.execute("SELECT 1")
        return {"status": "ok"}

    @api.post(
        "/v1/documents",
        response_model=DocumentAccepted,
        status_code=status.HTTP_201_CREATED,
    )
    def upload_document(
        request: Request,
        household_id: UUID = Form(alias="householdId"),
        file: UploadFile = File(...),
        user_id: UUID = Depends(authenticated_user),
    ) -> DocumentAccepted:
        settings = request.app.state.settings
        data = file.file.read(settings.max_upload_bytes + 1)
        try:
            metadata = inspect_image(
                data,
                file.content_type,
                settings.max_upload_bytes,
                settings.max_image_dimension,
                settings.max_image_pixels,
            )
        except ImageRejected as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail=exc.code,
            ) from exc

        document_id = uuid4()
        storage_key: str | None = None
        stored_path: Path | None = None
        try:
            with request.app.state.connect() as conn:
                member = conn.execute(
                    """
                    SELECT 1
                    FROM gestion.memberships
                    WHERE household_id = %s AND user_id = %s
                    """,
                    (household_id, user_id),
                ).fetchone()
                if not member:
                    raise HTTPException(status_code=403, detail="not_a_household_member")

                storage_key, stored_path = _save_private_file(
                    settings.storage_dir,
                    data,
                    metadata.extension,
                )
                conn.execute(
                    """
                    INSERT INTO producto.documents (
                        id, household_id, owner_user_id, storage_key,
                        mime_type, byte_size, width, height
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        document_id,
                        household_id,
                        user_id,
                        storage_key,
                        metadata.mime_type,
                        metadata.byte_size,
                        metadata.width,
                        metadata.height,
                    ),
                )
        except Exception:
            if stored_path is not None:
                stored_path.unlink(missing_ok=True)
            raise

        logger.info("document_uploaded document_id=%s", document_id)
        return DocumentAccepted(documentId=document_id, status="uploaded")

    @api.post(
        "/v1/runs",
        response_model=RunAccepted,
        status_code=status.HTTP_202_ACCEPTED,
    )
    def create_run(
        body: CreateRunBody,
        request: Request,
        background_tasks: BackgroundTasks,
        user_id: UUID = Depends(authenticated_user),
    ) -> RunAccepted:
        settings = request.app.state.settings
        run_id = uuid4()
        session_key = f"vita:run:{run_id}"
        report_ref = secrets.token_urlsafe(32)
        scan_ref = secrets.token_urlsafe(32) if body.document_id else None
        calendar_ref = secrets.token_urlsafe(32) if body.calendar else None
        deadline = datetime.now(timezone.utc) + timedelta(
            seconds=settings.openclaw_timeout_seconds
        )

        with request.app.state.connect() as conn:
            member = conn.execute(
                """
                SELECT 1
                FROM gestion.memberships
                WHERE household_id = %s AND user_id = %s
                """,
                (body.household_id, user_id),
            ).fetchone()
            if not member:
                raise HTTPException(status_code=403, detail="not_a_household_member")

            if body.document_id:
                document = conn.execute(
                    """
                    SELECT 1
                    FROM producto.documents
                    WHERE id = %s
                      AND household_id = %s
                      AND owner_user_id = %s
                    """,
                    (body.document_id, body.household_id, user_id),
                ).fetchone()
                if not document:
                    raise HTTPException(status_code=404, detail="document_not_found")

            if body.calendar:
                if not settings.google_calendar_enabled:
                    raise HTTPException(
                        status_code=503,
                        detail="google_calendar_not_configured",
                    )
                connection = conn.execute(
                    """
                    SELECT 1
                    FROM producto.google_calendar_connections
                    WHERE owner_user_id = %s
                    """,
                    (user_id,),
                ).fetchone()
                if not connection:
                    raise HTTPException(
                        status_code=409,
                        detail="google_calendar_not_connected",
                    )
            conn.execute(
                """
                INSERT INTO producto.runs (
                    id, household_id, owner_user_id, document_id, status,
                    deadline_at, openclaw_session_key, report_ref_hash, scan_ref_hash,
                    calendar_ref_hash, calendar_start_date, calendar_end_date
                )
                VALUES (%s, %s, %s, %s, 'queued', %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    run_id,
                    body.household_id,
                    user_id,
                    body.document_id,
                    deadline,
                    session_key,
                    token_digest(report_ref),
                    token_digest(scan_ref) if scan_ref else None,
                    token_digest(calendar_ref) if calendar_ref else None,
                    body.calendar.start_date if body.calendar else None,
                    body.calendar.end_date if body.calendar else None,
                ),
            )

        request.app.state.signals.register(run_id)
        background_tasks.add_task(
            dispatch_run,
            request.app,
            run_id,
            body.message,
            report_ref,
            scan_ref,
            calendar_ref,
        )
        logger.info("run_queued run_id=%s", run_id)
        return RunAccepted(runId=run_id, status="queued")

    @api.get("/v1/runs/{run_id}", response_model=RunView)
    def get_run(
        run_id: UUID,
        request: Request,
        user_id: UUID = Depends(authenticated_user),
    ) -> RunView:
        with request.app.state.connect() as conn:
            row = conn.execute(
                """
                SELECT id, status, result, error_code
                FROM producto.runs
                WHERE id = %s AND owner_user_id = %s
                """,
                (run_id, user_id),
            ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="run_not_found")
        return RunView(
            runId=row["id"],
            status=row["status"],
            result=row["result"],
            errorCode=row["error_code"],
        )

    @api.post(
        "/v1/runs/{run_id}/confirm",
        response_model=ConfirmationAccepted,
    )
    def confirm_expiration(
        run_id: UUID,
        body: ConfirmBody,
        request: Request,
        user_id: UUID = Depends(authenticated_user),
    ) -> ConfirmationAccepted:
        expires_on = date.fromisoformat(body.expires_on)
        with request.app.state.connect() as conn:
            run = conn.execute(
                """
                SELECT id, household_id, owner_user_id, document_id, status, result
                FROM producto.runs
                WHERE id = %s AND owner_user_id = %s
                FOR UPDATE
                """,
                (run_id, user_id),
            ).fetchone()
            if not run:
                raise HTTPException(status_code=404, detail="run_not_found")
            if run["status"] != "completed" or run["document_id"] is None:
                raise HTTPException(status_code=409, detail="run_not_confirmable")

            document = conn.execute(
                """
                SELECT id, scan_status
                FROM producto.documents
                WHERE id = %s
                  AND household_id = %s
                  AND owner_user_id = %s
                FOR UPDATE
                """,
                (run["document_id"], run["household_id"], user_id),
            ).fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="document_not_found")

            existing = conn.execute(
                """
                SELECT id, expires_on, days_before, notify_at
                FROM producto.reminders
                WHERE run_id = %s
                """,
                (run_id,),
            ).fetchone()
            if existing:
                if (
                    existing["expires_on"] != expires_on
                    or existing["days_before"] != body.days_before
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="confirmation_conflict",
                    )
                return _confirm_response(run_id, document["id"], existing)

            if document["scan_status"] != "needs_confirmation":
                raise HTTPException(status_code=409, detail="document_not_confirmable")

            result = run["result"]
            if not isinstance(result, dict) or result.get("status") not in {
                "date_found",
                "date_missing",
                "date_ambiguous",
            }:
                raise HTTPException(status_code=409, detail="run_not_confirmable")

            household = conn.execute(
                "SELECT timezone FROM gestion.households WHERE id = %s",
                (run["household_id"],),
            ).fetchone()
            try:
                notify_at = scheduled_reminder_at(
                    expires_on,
                    body.days_before,
                    household["timezone"],
                )
            except ReminderInPast as exc:
                raise HTTPException(
                    status_code=409,
                    detail="reminder_would_be_in_past",
                ) from exc
            except ValueError as exc:
                logger.error("invalid_household_timezone household_id=%s", run["household_id"])
                raise HTTPException(
                    status_code=500,
                    detail="invalid_household_timezone",
                ) from exc

            reminder_id = uuid4()
            conn.execute(
                """
                INSERT INTO producto.reminders (
                    id, household_id, owner_user_id, document_id, run_id,
                    expires_on, days_before, notify_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    reminder_id,
                    run["household_id"],
                    user_id,
                    document["id"],
                    run_id,
                    expires_on,
                    body.days_before,
                    notify_at,
                ),
            )
            conn.execute(
                """
                UPDATE producto.documents
                SET expires_on = %s,
                    confirmed_at = now(),
                    scan_status = 'confirmed'
                WHERE id = %s
                """,
                (expires_on, document["id"]),
            )

        logger.info("reminder_scheduled run_id=%s reminder_id=%s", run_id, reminder_id)
        return ConfirmationAccepted(
            reminderId=reminder_id,
            runId=run_id,
            documentId=document["id"],
            expiresOn=expires_on,
            scheduledAt=notify_at.isoformat(),
            status="scheduled",
        )

    @api.post("/v1/internal/report-result", include_in_schema=False)
    async def internal_report_result(request: Request) -> dict[str, bool]:
        report_ref = bearer_token(request)
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > REPORT_BODY_LIMIT:
                disposition = fail_invalid_report(request.app, report_ref)
                if disposition == "not_found":
                    raise HTTPException(status_code=404, detail="reference_not_found")
                raise HTTPException(status_code=413, detail="result_too_large")
            body.extend(chunk)

        try:
            raw = json.loads(body)
            outcome = run_outcome_adapter.validate_python(raw)
        except (
            json.JSONDecodeError,
            UnicodeDecodeError,
            ValidationError,
            TypeError,
        ):
            disposition = fail_invalid_report(request.app, report_ref)
            if disposition == "not_found":
                raise HTTPException(status_code=404, detail="reference_not_found")
            raise HTTPException(status_code=422, detail="invalid_result")

        result = outcome.model_dump(mode="json", by_alias=True)
        disposition = report_result(request.app, report_ref, result)
        if disposition == "not_found":
            raise HTTPException(status_code=404, detail="reference_not_found")
        if disposition == "expired":
            raise HTTPException(status_code=410, detail="reference_expired")
        if disposition == "invalid":
            raise HTTPException(status_code=422, detail="invalid_result")
        if disposition == "final":
            raise HTTPException(status_code=409, detail="run_already_final")
        return {"accepted": disposition == "accepted"}

    @api.post("/v1/internal/scan", include_in_schema=False)
    def internal_scan(request: Request) -> dict[str, str]:
        scan_ref = bearer_token(request)
        claim = claim_scan(request.app, scan_ref)
        if isinstance(claim, str):
            if claim == "used":
                raise HTTPException(status_code=409, detail="scan_already_used")
            if claim == "expired":
                raise HTTPException(status_code=410, detail="reference_expired")
            raise HTTPException(status_code=404, detail="reference_not_found")
        if "cached_result" in claim:
            return claim["cached_result"]

        settings = request.app.state.settings
        storage_key = claim["storage_key"]
        root = settings.storage_dir.resolve()
        path = (root / storage_key).resolve()
        if Path(storage_key).name != storage_key or path.parent != root:
            finish_if_active(request.app, claim["id"], "failed", "document_unavailable")
            raise HTTPException(status_code=503, detail="document_unavailable")
        if not path.is_file():
            finish_if_active(request.app, claim["id"], "failed", "document_unavailable")
            raise HTTPException(status_code=503, detail="document_unavailable")

        try:
            result = request.app.state.ocr.scan(path).as_json()
        except OcrUnavailable as exc:
            finish_if_active(request.app, claim["id"], "failed", "ocr_unavailable")
            raise HTTPException(status_code=503, detail="ocr_unavailable") from exc

        if not store_scan_result(request.app, claim["id"], result):
            finish_if_active(request.app, claim["id"], "timed_out", "scan_timeout")
            raise HTTPException(status_code=410, detail="run_no_longer_active")
        return result

    @api.post("/v1/internal/calendar/read", include_in_schema=False)
    def internal_read_calendar(request: Request) -> dict:
        calendar_ref = bearer_token(request)
        claim = consume_calendar_ref(request.app, calendar_ref)
        if isinstance(claim, str):
            if claim == "used":
                raise HTTPException(status_code=409, detail="calendar_read_already_used")
            if claim == "expired":
                with request.app.state.connect() as conn:
                    conn.execute(
                        "SELECT pg_notify('vita_run_finished', %s)",
                        ("calendar_expired",),
                    )
                raise HTTPException(status_code=410, detail="reference_expired")
            if claim == "final":
                raise HTTPException(status_code=409, detail="run_already_final")
            raise HTTPException(status_code=404, detail="reference_not_found")
        if "cached_result" in claim:
            return claim["cached_result"]

        try:
            result = list_calendar_events(
                request.app.state.settings,
                claim["refresh_token_ciphertext"],
                claim["calendar_start_date"],
                claim["calendar_end_date"],
                claim["timezone"],
            )
        except CalendarIntegrationError as exc:
            if exc.code in {
                "google_calendar_authorization_failed",
                "google_calendar_api_error",
            }:
                with request.app.state.connect() as conn:
                    conn.execute(
                        """
                        DELETE FROM producto.google_calendar_connections
                        WHERE owner_user_id = %s
                        """,
                        (claim["owner_user_id"],),
                    )
            if exc.code == "google_calendar_timeout":
                fail_calendar_run(request.app, claim["id"], "calendar_timeout")
            elif exc.code == "google_calendar_api_error":
                fail_calendar_run(request.app, claim["id"], "calendar_api_error")
            elif exc.code == "calendar_timezone_mismatch":
                fail_calendar_run(request.app, claim["id"], "invalid_calendar_response")
            elif exc.code in {
                "google_calendar_authorization_failed",
                "google_calendar_unavailable",
                "invalid_calendar_response",
                "invalid_calendar_window",
                "invalid_household_timezone",
                "google_calendar_credentials_unavailable",
            }:
                fail_calendar_run(request.app, claim["id"], exc.code)
            status_code = 504 if exc.code == "google_calendar_timeout" else 502
            if exc.code in {
                "google_calendar_not_configured",
                "google_calendar_credentials_unavailable",
            }:
                status_code = 503
            elif exc.code == "invalid_household_timezone":
                status_code = 500
            raise HTTPException(status_code=status_code, detail=exc.code) from exc

        if not store_calendar_result(request.app, claim["id"], result):
            raise HTTPException(status_code=410, detail="run_no_longer_active")
        return result

    return api


app = create_app()
