SET ROLE vita_producto_owner;

CREATE TABLE producto.google_calendar_connections (
    owner_user_id uuid PRIMARY KEY REFERENCES gestion.users(id),
    google_subject text NOT NULL,
    refresh_token_ciphertext bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE producto.google_oauth_states (
    state_hash text PRIMARY KEY,
    owner_user_id uuid NOT NULL REFERENCES gestion.users(id),
    code_verifier_ciphertext bytea NOT NULL,
    nonce_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE producto.runs
    ADD COLUMN calendar_ref_hash text UNIQUE,
    ADD COLUMN calendar_start_date date,
    ADD COLUMN calendar_end_date date,
    ADD COLUMN calendar_used_at timestamptz,
    ADD COLUMN calendar_result jsonb,
    ADD CONSTRAINT runs_calendar_reference_check CHECK (
        (calendar_ref_hash IS NULL)
        OR (
            calendar_start_date IS NOT NULL
            AND calendar_end_date IS NOT NULL
            AND document_id IS NULL
        )
    ),
    ADD CONSTRAINT runs_calendar_window_check CHECK (
        (calendar_start_date IS NULL AND calendar_end_date IS NULL)
        OR (
            calendar_start_date IS NOT NULL
            AND calendar_end_date IS NOT NULL
            AND calendar_end_date >= calendar_start_date
            AND calendar_end_date <= calendar_start_date + 30
        )
    );

CREATE INDEX google_oauth_states_expiry_idx
    ON producto.google_oauth_states (expires_at);

RESET ROLE;