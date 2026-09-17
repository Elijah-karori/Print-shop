-- Migration 0010: Task Management Module, Rate Cards, Capability Matrix & Dynamic Bidding

CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT,
    phone           TEXT NOT NULL,
    customer_type   VARCHAR(32) NOT NULL DEFAULT 'personal', -- 'enterprise', 'personal'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technicians (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT NOT NULL,
    email                   TEXT,
    phone                   TEXT NOT NULL UNIQUE,
    level                   VARCHAR(32) NOT NULL DEFAULT 'junior', -- 'junior', 'intermediate', 'senior', 'master'
    base_callout_fee_kes   NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    overall_rating          NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    rating_count            INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machine_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE, -- e.g. "Printers", "POS Terminals", "Medical Imaging"
    code        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technician_rate_cards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id       UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    service_type        VARCHAR(32) NOT NULL, -- 'corrective', 'preventive', 'contract_based', 'project_based', 'one_time'
    machine_category_id UUID REFERENCES machine_categories(id) ON DELETE CASCADE, -- NULL indicates category-agnostic fallback
    rate_kes            NUMERIC(10, 2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_tech_rate_card UNIQUE (technician_id, service_type, machine_category_id)
);

CREATE TABLE IF NOT EXISTS technician_machine_experience (
    technician_id         UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    machine_category_id   UUID NOT NULL REFERENCES machine_categories(id) ON DELETE CASCADE,
    jobs_completed_count  INT NOT NULL DEFAULT 0,
    PRIMARY KEY (technician_id, machine_category_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_type         VARCHAR(32) NOT NULL, -- 'enterprise', 'personal'
    service_type          VARCHAR(32) NOT NULL, -- 'corrective', 'preventive', 'contract_based', 'project_based', 'one_time'
    machine_category_id   UUID REFERENCES machine_categories(id) ON DELETE SET NULL,
    title                 TEXT NOT NULL,
    description           TEXT,
    target_price_kes      NUMERIC(10, 2),
    earliest_start_time   TIMESTAMPTZ,
    deadline_time         TIMESTAMPTZ,
    state                 VARCHAR(32) NOT NULL DEFAULT 'open_for_bidding', -- 'draft', 'open_for_bidding', 'assigned', 'in_progress', 'completed', 'cancelled', 'bidding_closed'
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bids (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    technician_id       UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    bid_amount_kes      NUMERIC(10, 2) NOT NULL,
    proposed_start_time TIMESTAMPTZ,
    status              VARCHAR(32) NOT NULL DEFAULT 'submitted', -- 'submitted', 'accepted', 'rejected'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_task_technician_bid UNIQUE (task_id, technician_id)
);

CREATE TABLE IF NOT EXISTS ratings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    score         NUMERIC(3, 2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
    review_text   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_customer ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
CREATE INDEX IF NOT EXISTS idx_bids_task ON bids(task_id);
CREATE INDEX IF NOT EXISTS idx_bids_technician ON bids(technician_id);
