"""Copia y restauración de la base y de los archivos de documentos, juntos en un solo .tar.gz.

Uso, con la API parada para que nadie escriba a la vez:
    python -m app.backup create /copias/vita.tar.gz
    python -m app.backup restore /copias/vita.tar.gz --yes
Con «-» en vez de la ruta, la copia sale por la salida estándar o se lee de la entrada estándar,
para usarla desde Docker sin montar carpetas (ver docs/backend.md).
Necesita MIGRATION_DATABASE_URL: la API no puede leer ni vaciar todas las tablas.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from psycopg import sql

from app.config import Settings
from app.storage import STORED_NAME, stored_path

FORMAT = 1
# En orden de dependencias. Una tabla nueva sin añadir aquí hace fallar la copia.
TABLES = (
    "gestion.users",
    "gestion.households",
    "gestion.memberships",
    "producto.documents",
    "producto.runs",
    "producto.reminders",
    "producto.google_calendar_connections",
    "producto.google_oauth_states",
)


class BackupError(RuntimeError):
    pass


def _connect(settings: Settings) -> psycopg.Connection:
    if not settings.migration_database_url:
        raise BackupError("MIGRATION_DATABASE_URL es obligatorio para copiar o restaurar")
    return psycopg.connect(settings.migration_database_url)


def _identifier(table: str) -> sql.Identifier:
    schema, name = table.split(".")
    return sql.Identifier(schema, name)


def _columns(conn: psycopg.Connection, table: str) -> list[str]:
    schema, name = table.split(".")
    rows = conn.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
        """,
        (schema, name),
    ).fetchall()
    return [row[0] for row in rows]


def _migrations(conn: psycopg.Connection) -> list[str]:
    return sorted(row[0] for row in conn.execute("SELECT version FROM producto.schema_migrations"))


def _check_tables(conn: psycopg.Connection) -> None:
    present = {
        f"{schema}.{name}"
        for schema, name in conn.execute(
            """
            SELECT table_schema, table_name FROM information_schema.tables
            WHERE table_schema IN ('gestion', 'producto') AND table_type = 'BASE TABLE'
            """
        ).fetchall()
    } - {"producto.schema_migrations"}
    if present != set(TABLES):
        raise BackupError(f"Las tablas no coinciden con la copia: {sorted(present ^ set(TABLES))}")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _add(archive: tarfile.TarFile, name: str, data: bytes) -> None:
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = 0o600
    archive.addfile(info, io.BytesIO(data))


def create_backup(settings: Settings, destination: Path) -> dict:
    destination = Path(destination)
    manifest: dict = {"format": FORMAT, "createdAt": datetime.now(timezone.utc).isoformat(), "tables": {}, "files": {}}
    dumps: dict[str, bytes] = {}
    with _connect(settings) as conn:
        # Una sola instantánea: las tablas y la lista de archivos se leen en el mismo momento.
        conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        _check_tables(conn)
        manifest["migrations"] = _migrations(conn)
        for table in TABLES:
            columns = _columns(conn, table)
            buffer = bytearray()
            query = sql.SQL("COPY {} ({}) TO STDOUT (FORMAT csv)").format(
                _identifier(table), sql.SQL(", ").join(map(sql.Identifier, columns))
            )
            with conn.cursor().copy(query) as copy:
                for chunk in copy:
                    buffer.extend(chunk)
            dumps[table] = bytes(buffer)
            manifest["tables"][table] = {"columns": columns, "sha256": _sha256(dumps[table])}
        keys = [row[0] for row in conn.execute("SELECT storage_key FROM producto.documents ORDER BY storage_key")]

    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".vita-backup-", dir=destination.parent)
    try:
        # Lleva fotos de documentos de identidad: solo la lee quien la crea.
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "wb") as raw, tarfile.open(fileobj=raw, mode="w:gz") as archive:
            for table, data in dumps.items():
                _add(archive, f"db/{table}.csv", data)
            for key in keys:
                path = stored_path(settings.storage_dir, key)
                if not path.is_file():
                    raise BackupError(f"Falta el archivo del documento {key}")
                data = path.read_bytes()
                manifest["files"][key] = _sha256(data)
                _add(archive, f"files/{key}", data)
            _add(archive, "manifest.json", json.dumps(manifest, indent=2).encode())
        os.replace(temporary, destination)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise
    return {"tables": len(dumps), "files": len(manifest["files"]), "path": str(destination)}


def _read_archive(source: Path) -> tuple[dict, dict[str, bytes], dict[str, bytes]]:
    try:
        archive = tarfile.open(source, mode="r:gz")
    except (OSError, tarfile.TarError) as exc:
        raise BackupError("No es una copia de Vita legible") from exc
    with archive:
        members: dict[str, bytes] = {}
        for member in archive.getmembers():
            name = member.name
            allowed = (
                name == "manifest.json"
                or (name.startswith("db/") and name[3:].removesuffix(".csv") in TABLES and name.endswith(".csv"))
                or (name.startswith("files/") and STORED_NAME.fullmatch(name[6:]) is not None)
            )
            if not allowed or not member.isfile() or name in members:
                raise BackupError(f"Contenido inesperado en la copia: {name}")
            members[name] = archive.extractfile(member).read()
    try:
        manifest = json.loads(members.pop("manifest.json"))
    except (KeyError, ValueError) as exc:
        raise BackupError("La copia no tiene un manifest.json válido") from exc
    if manifest.get("format") != FORMAT:
        raise BackupError("Formato de copia desconocido")
    tables = {name[3:-4]: data for name, data in members.items() if name.startswith("db/")}
    files = {name[6:]: data for name, data in members.items() if name.startswith("files/")}
    if set(tables) != set(TABLES) or set(manifest["tables"]) != set(TABLES):
        raise BackupError("La copia no coincide con su manifiesto: faltan tablas")
    if set(files) != set(manifest["files"]):
        raise BackupError("La copia no coincide con su manifiesto: faltan archivos")
    for table, data in tables.items():
        if _sha256(data) != manifest["tables"][table]["sha256"]:
            raise BackupError(f"La tabla {table} no coincide con su huella")
    for key, data in files.items():
        if _sha256(data) != manifest["files"][key]:
            raise BackupError(f"El archivo {key} no coincide con su huella")
    return manifest, tables, files


def restore_backup(settings: Settings, source: Path) -> dict:
    """Sustituye la base y los archivos por los de la copia. Antes lo comprueba todo."""
    manifest, tables, files = _read_archive(Path(source))
    root = settings.storage_dir
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    with _connect(settings) as conn:
        if _migrations(conn) != manifest["migrations"]:
            raise BackupError("Las migraciones de la copia y de la base no coinciden")
        _check_tables(conn)
        for table in TABLES:
            if _columns(conn, table) != manifest["tables"][table]["columns"]:
                raise BackupError(f"Las columnas de {table} no coinciden")
        conn.execute(sql.SQL("TRUNCATE {}").format(sql.SQL(", ").join(map(_identifier, TABLES))))
        for table in TABLES:
            query = sql.SQL("COPY {} ({}) FROM STDIN (FORMAT csv)").format(
                _identifier(table), sql.SQL(", ").join(map(sql.Identifier, manifest["tables"][table]["columns"]))
            )
            with conn.cursor().copy(query) as copy:
                copy.write(tables[table])
        # Los archivos se escriben antes de confirmar: si la base falla, solo quedan huérfanos que se limpian.
        for key, data in files.items():
            temporary = root / f".restore-{key}"
            temporary.write_bytes(data)
            temporary.chmod(0o600)
            os.replace(temporary, stored_path(root, key))
        conn.commit()
    for path in root.iterdir():
        if STORED_NAME.fullmatch(path.name) and path.name not in files:
            path.unlink(missing_ok=True)
    return {"tables": len(tables), "files": len(files)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.backup", description="Copia de la base y los archivos de Vita")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("create", help="crear una copia").add_argument("path")
    restore = commands.add_parser("restore", help="sustituir la base y los archivos por una copia")
    restore.add_argument("path")
    restore.add_argument("--yes", action="store_true", help="confirma que se borrará lo que hay ahora")
    args = parser.parse_args(argv)
    settings = Settings.from_env()
    if args.command == "restore" and not args.yes:
        print("La restauración borra la base y los archivos actuales. Repite con --yes.", file=sys.stderr)
        return 2
    try:
        with tempfile.TemporaryDirectory(prefix="vita-backup-") as scratch:
            path = Path(scratch) / "vita.tar.gz" if args.path == "-" else Path(args.path)
            if args.command == "create":
                summary = create_backup(settings, path)
                if args.path == "-":
                    sys.stdout.buffer.write(path.read_bytes())
            else:
                if args.path == "-":
                    path.write_bytes(sys.stdin.buffer.read())
                summary = restore_backup(settings, path)
        # Con «-», la salida estándar es la copia: el resumen va aparte.
        print(json.dumps(summary), file=sys.stderr if args.path == "-" else sys.stdout)
        return 0
    except BackupError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
