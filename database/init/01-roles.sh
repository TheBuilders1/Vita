#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=api_password="$VITA_API_PASSWORD" \
  --set=migrator_password="$VITA_MIGRATOR_PASSWORD" <<'SQL'
\set ON_ERROR_STOP on

CREATE ROLE vita_gestion_owner NOLOGIN;
CREATE ROLE vita_producto_owner NOLOGIN;
CREATE ROLE vita_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE vita_api LOGIN PASSWORD :'api_password';

GRANT vita_gestion_owner, vita_producto_owner TO vita_migrator;

CREATE SCHEMA gestion AUTHORIZATION vita_gestion_owner;
CREATE SCHEMA producto AUTHORIZATION vita_producto_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA gestion, producto TO vita_api;
GRANT USAGE ON SCHEMA gestion TO vita_producto_owner;

ALTER DEFAULT PRIVILEGES FOR ROLE vita_gestion_owner IN SCHEMA gestion
  GRANT SELECT ON TABLES TO vita_api;
ALTER DEFAULT PRIVILEGES FOR ROLE vita_gestion_owner IN SCHEMA gestion
  GRANT REFERENCES ON TABLES TO vita_producto_owner;
ALTER DEFAULT PRIVILEGES FOR ROLE vita_producto_owner IN SCHEMA producto
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vita_api;
SQL
