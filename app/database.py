from __future__ import annotations

import logging

import psycopg
from psycopg.rows import dict_row

from app.config import Settings

logger = logging.getLogger(__name__)


def connect(settings: Settings) -> psycopg.Connection:
    return psycopg.connect(settings.database_url, row_factory=dict_row)


def recover_interrupted_runs(settings: Settings) -> int:
    with connect(settings) as conn:
        rows = conn.execute(
            """
            UPDATE producto.runs
            SET status = 'failed',
                error_code = 'interrupted',
                finished_at = now(),
                report_ref_hash = NULL,
                scan_ref_hash = NULL,
                calendar_ref_hash = NULL
            WHERE status IN ('queued', 'running')
            RETURNING id
            """
        ).fetchall()

    for row in rows:
        logger.warning("run_interrupted run_id=%s", row["id"])
    return len(rows)
