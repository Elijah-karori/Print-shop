-- Core schema for the independent tech services platform.
-- Run with: psql $DATABASE_URL -f internal/db/migrations/0001_init.sql
-- (or wire up golang-migrate later once the schema stabilizes)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE ticket_status AS ENUM (
    'received',
    'dispatched',
    'in_progress',
    'resolved',
    'cancelled'
);

CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'emergency');

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TYPE package_cadence AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL UNIQUE, -- used for WhatsApp + ticket lookup
    business_type   TEXT,                  -- e.g. "clinic", "cybercafe", "retail"
    location        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    device_type     TEXT NOT NULL,  -- Printer, POS, Smart Board, etc.
    brand           TEXT,
    model           TEXT,
    serial_number   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code     TEXT NOT NULL UNIQUE, -- short human-readable code for lookup, e.g. "TKT-7F3K2"
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
    issue_desc      TEXT NOT NULL,
    priority        ticket_priority NOT NULL DEFAULT 'normal',
    status          ticket_status NOT NULL DEFAULT 'received',
    scheduled_at    TIMESTAMPTZ,          -- booked on-site visit slot
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    status          ticket_status NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    price_kes       NUMERIC(10,2) NOT NULL,
    cadence         package_cadence NOT NULL DEFAULT 'one_time',
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    item_type           TEXT NOT NULL, -- 'spare_part' | 'service_package' | 'digital_download'
    item_ref            UUID,          -- FK to service_packages.id when applicable
    description         TEXT NOT NULL,
    amount_kes          NUMERIC(10,2) NOT NULL,
    status              order_status NOT NULL DEFAULT 'pending',
    mpesa_checkout_id   TEXT,          -- CheckoutRequestID from STK Push
    mpesa_receipt       TEXT,          -- MpesaReceiptNumber once confirmed
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    body_md         TEXT NOT NULL,
    excerpt         TEXT,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_client_id ON tickets(client_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_devices_client_id ON devices(client_id);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
