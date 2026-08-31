-- Spare parts inventory. Kept separate from service_packages since parts
-- have stock quantities and packages don't.

CREATE TABLE parts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku             TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT,
    price_kes       NUMERIC(10,2) NOT NULL,
    stock_qty       INTEGER NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_active ON parts(active);
