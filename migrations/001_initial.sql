SET ROLE vita_gestion_owner;

CREATE TABLE gestion.users (
    id uuid PRIMARY KEY,
    display_name text NOT NULL
);

CREATE TABLE gestion.households (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    timezone text NOT NULL DEFAULT 'Europe/Madrid'
);

CREATE TABLE gestion.memberships (
    household_id uuid NOT NULL REFERENCES gestion.households(id),
    user_id uuid NOT NULL REFERENCES gestion.users(id),
    role text NOT NULL CHECK (role IN ('owner', 'member')),
    PRIMARY KEY (household_id, user_id)
);

INSERT INTO gestion.users (id, display_name) VALUES
    ('11111111-1111-4111-8111-111111111111', 'Alba Demo'),
    ('22222222-2222-4222-8222-222222222222', 'Bruno Demo'),
    ('33333333-3333-4333-8333-333333333333', 'Carla Demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO gestion.households (id, name, timezone) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hogar Vita Demo', 'Europe/Madrid'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Hogar ajeno Demo', 'Europe/Madrid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO gestion.memberships (household_id, user_id, role) VALUES
    (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111',
        'owner'
    ),
    (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '22222222-2222-4222-8222-222222222222',
        'member'
    ),
    (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '33333333-3333-4333-8333-333333333333',
        'owner'
    )
ON CONFLICT (household_id, user_id) DO NOTHING;

GRANT USAGE ON SCHEMA gestion TO vita_producto_owner;

RESET ROLE;

SET ROLE vita_producto_owner;

CREATE TABLE producto.documents (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES gestion.households(id),
    owner_user_id uuid NOT NULL REFERENCES gestion.users(id),
    storage_key text NOT NULL UNIQUE,
    mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
    byte_size integer NOT NULL CHECK (byte_size > 0),
    width integer NOT NULL CHECK (width > 0),
    height integer NOT NULL CHECK (height > 0),
    scan_status text NOT NULL DEFAULT 'pending'
        CHECK (scan_status IN ('pending', 'needs_confirmation', 'confirmed')),
    proposed_expires_on date,
    expires_on date,
    created_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    UNIQUE (id, household_id, owner_user_id)
);

CREATE TABLE producto.runs (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES gestion.households(id),
    owner_user_id uuid NOT NULL REFERENCES gestion.users(id),
    document_id uuid REFERENCES producto.documents(id),
    status text NOT NULL CHECK (
        status IN ('queued', 'running', 'completed', 'failed', 'timed_out')
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    deadline_at timestamptz NOT NULL,
    finished_at timestamptz,
    openclaw_session_key text NOT NULL UNIQUE,
    report_ref_hash text UNIQUE,
    scan_ref_hash text UNIQUE,
    scan_used_at timestamptz,
    scan_result jsonb,
    result jsonb,
    error_code text
);

CREATE TABLE producto.reminders (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES gestion.households(id),
    owner_user_id uuid NOT NULL REFERENCES gestion.users(id),
    document_id uuid NOT NULL REFERENCES producto.documents(id),
    run_id uuid NOT NULL UNIQUE REFERENCES producto.runs(id),
    expires_on date NOT NULL,
    days_before integer NOT NULL CHECK (days_before BETWEEN 0 AND 365),
    notify_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runs_owner_created_idx
    ON producto.runs (owner_user_id, created_at DESC);
CREATE INDEX runs_active_idx
    ON producto.runs (status, deadline_at)
    WHERE status IN ('queued', 'running');
CREATE INDEX documents_owner_idx
    ON producto.documents (owner_user_id, created_at DESC);
CREATE INDEX reminders_owner_notify_idx
    ON producto.reminders (owner_user_id, notify_at);

RESET ROLE;
