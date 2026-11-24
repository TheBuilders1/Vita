from __future__ import annotations

from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from app.config import Settings

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def migrate(settings: Settings | None = None) -> None:
    config = settings or Settings.from_env()
    if not config.migration_database_url:
        raise ValueError("MIGRATION_DATABASE_URL es obligatorio para ejecutar migraciones")

    with psycopg.connect(config.migration_database_url, row_factory=dict_row) as conn:
        conn.execute("SET ROLE vita_producto_owner")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS producto.schema_migrations (
                version text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
            """
        )
        conn.execute("REVOKE ALL ON producto.schema_migrations FROM vita_api")
        applied = {
            row["version"]
            for row in conn.execute(
                "SELECT version FROM producto.schema_migrations"
            ).fetchall()
        }
        conn.execute("RESET ROLE")
        conn.commit()

        for migration_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = migration_file.name
            if version in applied:
                continue

            with conn.transaction():
                conn.execute(migration_file.read_text(encoding="utf-8"))
                conn.execute("SET ROLE vita_producto_owner")
                conn.execute(
                    "INSERT INTO producto.schema_migrations (version) VALUES (%s)",
                    (version,),
                )
                conn.execute("RESET ROLE")
            print(f"applied {version}")


if __name__ == "__main__":
    migrate()
