-- Migration 0009: Consolidate Inventory Serialization & Unify Ledger

-- 1. Backfill serialized_items into item_units
INSERT INTO item_units (part_id, serial_number, unit_cost_kes, status, created_at, updated_at)
SELECT
    si.part_id,
    si.serial_number,
    COALESCE(p.price_kes, 0.00) AS unit_cost_kes,
    si.status::text AS status,
    si.created_at,
    si.updated_at
FROM serialized_items si
JOIN parts p ON p.id = si.part_id
ON CONFLICT (serial_number) DO UPDATE
SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;

-- 2. Backfill existing item_units into unit_transactions ledger
INSERT INTO unit_transactions (item_unit_id, action, note, created_at)
SELECT
    id AS item_unit_id,
    'receive' AS action,
    'Initial inventory backfill / stock creation' AS note,
    created_at
FROM item_units
ON CONFLICT DO NOTHING;

-- 3. Add FKs or indexes for blog_posts and orders where applicable
CREATE INDEX IF NOT EXISTS idx_orders_item_ref ON orders(item_ref);
CREATE INDEX IF NOT EXISTS idx_unit_transactions_item_unit_id ON unit_transactions(item_unit_id);
