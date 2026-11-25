"""Documentos en PostgreSQL + sistema de archivos: borrar, limpiar huérfanos, PDF y copias."""

from __future__ import annotations

import io
import json
import os
import tarfile
import threading
import time
from io import BytesIO
from pathlib import Path

import psycopg
import pytest
from PIL import Image

from app.backup import BackupError, create_backup, restore_backup
from app.storage import purge_orphans
from conftest import Vita


def stored_files(vita: Vita) -> set[str]:
    return {p.name for p in vita.settings.storage_dir.iterdir() if p.is_file()}


def count(vita: Vita, table: str) -> int:
    with psycopg.connect(vita.settings.database_url) as conn:
        return conn.execute(f"SELECT count(*) FROM producto.{table}").fetchone()[0]  # noqa: S608


def storage_key(vita: Vita, document_id: str) -> str:
    with psycopg.connect(vita.settings.database_url) as conn:
        return conn.execute(
            "SELECT storage_key FROM producto.documents WHERE id = %s", (document_id,)
        ).fetchone()[0]


def pdf_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (60, 40), "white").save(output, format="PDF")
    return output.getvalue()


def upload_pdf(vita: Vita, data: bytes | None = None, content_type: str = "application/pdf"):
    return vita.client.post(
        "/v1/documents",
        headers=vita.auth(),
        data={"householdId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"},
        files={"file": ("dni.pdf", pdf_bytes() if data is None else data, content_type)},
    )


def scanned_and_confirmed(vita: Vita, document_id: str) -> str:
    vita.gateway.on_run = lambda prompt: vita.scan_and_report(prompt)
    run_id = vita.run(document_id).json()["runId"]
    assert vita.finished(run_id)["status"] == "completed"
    assert vita.confirm(run_id).status_code == 200
    return run_id


# Borrar


def test_deleting_a_document_removes_its_reading_its_reminder_and_its_file(vita: Vita) -> None:
    document_id = vita.upload().json()["documentId"]
    key = storage_key(vita, document_id)
    scanned_and_confirmed(vita, document_id)
    assert key in stored_files(vita)

    response = vita.client.delete(f"/v1/documents/{document_id}", headers=vita.auth())

    assert response.status_code == 204
    assert (count(vita, "documents"), count(vita, "runs"), count(vita, "reminders")) == (0, 0, 0)
    assert key not in stored_files(vita)
    assert vita.client.delete(f"/v1/documents/{document_id}", headers=vita.auth()).status_code == 404


def test_only_the_owner_can_delete_a_document(vita: Vita) -> None:
    document_id = vita.upload().json()["documentId"]
    for user in ("bruno", "carla"):
        response = vita.client.delete(f"/v1/documents/{document_id}", headers=vita.auth(user))
        assert response.status_code == 404
    assert count(vita, "documents") == 1


def test_a_document_being_read_cannot_be_deleted(vita: Vita) -> None:
    document_id = vita.upload().json()["documentId"]
    release = threading.Event()
    vita.gateway.on_run = lambda prompt: release.wait(5)
    run_id = vita.run(document_id).json()["runId"]

    response = vita.client.delete(f"/v1/documents/{document_id}", headers=vita.auth())

    assert response.status_code == 409
    assert response.json()["detail"] == "document_in_use"
    release.set()
    vita.finished(run_id, timeout=10)


# Archivos huérfanos


def test_orphan_files_older_than_the_grace_period_are_purged(vita: Vita) -> None:
    root = vita.settings.storage_dir
    kept = storage_key(vita, vita.upload().json()["documentId"])
    old_orphan = root / ("a" * 32 + ".png")
    new_orphan = root / ("b" * 32 + ".jpg")
    foreign = root / "nota.txt"
    for path in (old_orphan, new_orphan, foreign):
        path.write_bytes(b"x")
    hour_ago = time.time() - 7200
    for path in (old_orphan, foreign, root / kept):
        os.utime(path, (hour_ago, hour_ago))

    assert purge_orphans(vita.settings) == 1

    assert not old_orphan.exists()
    assert new_orphan.exists() and foreign.exists() and (root / kept).exists()
    new_orphan.unlink()
    foreign.unlink()


# PDF


def test_a_pdf_document_is_stored_and_scanned(vita: Vita) -> None:
    response = upload_pdf(vita)
    assert response.status_code == 201
    document_id = response.json()["documentId"]
    key = storage_key(vita, document_id)
    assert key.endswith(".pdf")
    assert (vita.settings.storage_dir / key).read_bytes().startswith(b"%PDF-")
    scanned_and_confirmed(vita, document_id)


@pytest.mark.parametrize(
    ("data", "content_type", "detail"),
    [
        (b"%PDF-1.7\nesto no es un pdf", "application/pdf", "invalid_document"),
        (b"no empieza como un pdf", "application/pdf", "invalid_document"),
        (None, "image/png", "invalid_image"),
        (None, "text/html", "unsupported_image_type"),
    ],
)
def test_fake_or_mislabelled_pdfs_are_rejected(vita: Vita, data, content_type, detail) -> None:
    response = upload_pdf(vita, data, content_type)
    assert response.status_code == 422
    assert response.json()["detail"] == detail
    assert count(vita, "documents") == 0


# Copia y restauración


def test_backup_and_restore_bring_back_database_and_files(vita: Vita, tmp_path: Path) -> None:
    image_id = vita.upload().json()["documentId"]
    pdf_id = upload_pdf(vita).json()["documentId"]
    scanned_and_confirmed(vita, image_id)
    keys = [storage_key(vita, image_id), storage_key(vita, pdf_id)]
    files_before = {name: (vita.settings.storage_dir / name).read_bytes() for name in keys}
    archive = tmp_path / "vita.tar.gz"

    summary = create_backup(vita.settings, archive)

    assert summary["files"] == 2
    assert oct(archive.stat().st_mode & 0o777) == "0o600"
    vita.client.delete(f"/v1/documents/{image_id}", headers=vita.auth())
    vita.client.delete(f"/v1/documents/{pdf_id}", headers=vita.auth())
    stray = vita.settings.storage_dir / ("c" * 32 + ".png")
    stray.write_bytes(b"de otra copia")
    assert count(vita, "documents") == 0

    restore_backup(vita.settings, archive)

    assert (count(vita, "documents"), count(vita, "runs"), count(vita, "reminders")) == (2, 1, 1)
    # La carpeta queda como en la copia: lo que no estaba en ella, fuera.
    assert {name: (vita.settings.storage_dir / name).read_bytes() for name in stored_files(vita)} == files_before
    assert not stray.exists()


def tampered(archive: Path, target: Path, change) -> Path:
    with tarfile.open(archive) as source, tarfile.open(target, "w:gz") as output:
        for member in source.getmembers():
            data = source.extractfile(member).read() if member.isfile() else None
            member, data = change(member, data)
            output.addfile(member, io.BytesIO(data) if data is not None else None)
    return target


def test_restore_refuses_damaged_or_unsafe_archives(vita: Vita, tmp_path: Path) -> None:
    vita.upload()
    archive = tmp_path / "vita.tar.gz"
    create_backup(vita.settings, archive)

    def flip_file(member, data):
        if member.name.startswith("files/"):
            data = b"cambiado" + data[8:]
        return member, data

    def escape(member, data):
        if member.name.startswith("files/"):
            member.name = "../fuera.png"
        return member, data

    def other_schema(member, data):
        if member.name == "manifest.json":
            manifest = json.loads(data)
            manifest["migrations"].append("999_futuro.sql")
            data = json.dumps(manifest).encode()
            member.size = len(data)
        return member, data

    for name, change, message in (
        ("dañada", flip_file, "no coincide"),
        ("escapa", escape, "inesperado"),
        ("versión", other_schema, "migraciones"),
    ):
        with pytest.raises(BackupError, match=message):
            restore_backup(vita.settings, tampered(archive, tmp_path / f"{name}.tar.gz", change))
    assert count(vita, "documents") == 1
    assert not (tmp_path / "fuera.png").exists()
