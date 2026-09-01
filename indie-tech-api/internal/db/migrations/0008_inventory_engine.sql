-- Migration 0008: Core Inventory, Deployment, Reliability (MTBF) & Analytics Engine

CREATE SCHEMA IF NOT EXISTS analytics;

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    contact_phone   TEXT,
    contact_email   TEXT,
    rating          NUMERIC(3,2) DEFAULT 5.00,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PO Lines & Price History
CREATE TABLE IF NOT EXISTS po_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number       TEXT NOT NULL,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_kes  NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    price_kes       NUMERIC(10,2) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Receipts & Serialized Item Units (locked unit cost at receipt)
CREATE TABLE IF NOT EXISTS receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_line_id      UUID NOT NULL REFERENCES po_lines(id) ON DELETE CASCADE,
    received_qty    INTEGER NOT NULL CHECK (received_qty > 0),
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    receipt_id      UUID REFERENCES receipts(id) ON DELETE SET NULL,
    serial_number   TEXT NOT NULL UNIQUE,
    unit_cost_kes   NUMERIC(10,2) NOT NULL, -- locked cost at receipt
    status          TEXT NOT NULL DEFAULT 'in_stock', -- 'in_stock' | 'installed' | 'deployed' | 'failed' | 'recalled'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Machine Components (Nesting: parts installed inside machines)
CREATE TABLE IF NOT EXISTS machine_components (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    item_unit_id    UUID NOT NULL REFERENCES item_units(id) ON DELETE CASCADE,
    installed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at      TIMESTAMPTZ,
    active          BOOLEAN NOT NULL DEFAULT true
);

-- 5. Deployments (Handoffs to customers / technicians without nesting)
CREATE TABLE IF NOT EXISTS deployments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_unit_id    UUID NOT NULL REFERENCES item_units(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
    assigned_to     TEXT, -- e.g. "Technician John" or "Client Office 2"
    deployed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    returned_at     TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'active' -- 'active' | 'returned' | 'decommissioned'
);

-- 6. Failure Events (Linking Machine, Failed Unit & Replacement Unit for MTBF calculations)
CREATE TABLE IF NOT EXISTS failure_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    failed_unit_id      UUID NOT NULL REFERENCES item_units(id) ON DELETE CASCADE,
    replacement_unit_id UUID REFERENCES item_units(id) ON DELETE SET NULL,
    ticket_id           UUID REFERENCES tickets(id) ON DELETE SET NULL,
    failure_reason      TEXT NOT NULL,
    operating_hours     INTEGER DEFAULT 0, -- accumulated operating hours before failure
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Unit Transactions Ledger (Immutable transactional history)
CREATE TABLE IF NOT EXISTS unit_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_unit_id    UUID NOT NULL REFERENCES item_units(id) ON DELETE CASCADE,
    action          TEXT NOT NULL, -- 'receive' | 'install' | 'deploy' | 'fail' | 'replace' | 'recall'
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_units_part_id ON item_units(part_id);
CREATE INDEX IF NOT EXISTS idx_item_units_status ON item_units(status);
CREATE INDEX IF NOT EXISTS idx_machine_components_device ON machine_components(device_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_device ON failure_events(device_id);
CREATE INDEX IF NOT EXISTS idx_failure_events_failed_unit ON failure_events(failed_unit_id);

-- 8. Analytics Schema & Materialized Views (MTBF per model & Supplier Failure Rates)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_mtbf_by_model AS
SELECT
    d.brand,
    d.model,
    COUNT(DISTINCT fe.id) AS total_failures,
    AVG(COALESCE(fe.operating_hours, 1000)) AS avg_operating_hours_to_failure,
    CASE
        WHEN COUNT(DISTINCT fe.id) > 0 THEN ROUND((SUM(COALESCE(fe.operating_hours, 1000))::numeric / COUNT(DISTINCT fe.id)), 2)
        ELSE 0
    END AS mtbf_hours
FROM devices d
JOIN failure_events fe ON fe.device_id = d.id
GROUP BY d.brand, d.model;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_supplier_failure_rates AS
SELECT
    s.id AS supplier_id,
    s.name AS supplier_name,
    COUNT(DISTINCT iu.id) AS total_units_received,
    COUNT(DISTINCT fe.id) AS total_failed_units,
    CASE
        WHEN COUNT(DISTINCT iu.id) > 0 THEN ROUND((COUNT(DISTINCT fe.id)::numeric / COUNT(DISTINCT iu.id)::numeric) * 100, 2)
        ELSE 0
    END AS failure_rate_percentage
FROM suppliers s
JOIN po_lines pol ON pol.supplier_id = s.id
JOIN receipts r ON r.po_line_id = pol.id
JOIN item_units iu ON iu.receipt_id = r.id
LEFT JOIN failure_events fe ON fe.failed_unit_id = iu.id
GROUP BY s.id, s.name;
