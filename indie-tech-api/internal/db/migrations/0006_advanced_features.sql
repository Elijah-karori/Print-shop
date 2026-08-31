-- Migration 0006: Inventory Serialization, Telemetry, Maintenance Types, Job Cards & Machine Management

CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective');
CREATE TYPE serialized_item_status AS ENUM ('in_stock', 'reserved', 'sold', 'recalled', 'defective');
CREATE TYPE job_card_status AS ENUM ('opened', 'in_progress', 'awaiting_parts', 'completed', 'signed_off');

ALTER TABLE tickets ADD COLUMN maintenance_type maintenance_type NOT NULL DEFAULT 'corrective';

CREATE TABLE serialized_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    serial_number   TEXT NOT NULL UNIQUE,
    status          serialized_item_status NOT NULL DEFAULT 'in_stock',
    recall_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE telemetry_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      TEXT NOT NULL, -- 'click' | 'purchase' | 'recall' | 'blog_view'
    target_type     TEXT NOT NULL, -- 'part' | 'package' | 'blog_post'
    target_id       TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_cards (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_code     TEXT NOT NULL UNIQUE, -- e.g. "JOB-8K92L"
    ticket_id         UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    device_id         UUID REFERENCES devices(id) ON DELETE SET NULL,
    technician_name   TEXT,
    work_done         TEXT,
    parts_used        JSONB, -- list of part IDs or SKUs used
    status            job_card_status NOT NULL DEFAULT 'opened',
    service_report    TEXT, -- detailed technician report summary
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_serialized_items_part_id ON serialized_items(part_id);
CREATE INDEX idx_serialized_items_status ON serialized_items(status);
CREATE INDEX idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_events_target ON telemetry_events(target_type, target_id);
CREATE INDEX idx_job_cards_ticket_id ON job_cards(ticket_id);
CREATE INDEX idx_job_cards_device_id ON job_cards(device_id);
