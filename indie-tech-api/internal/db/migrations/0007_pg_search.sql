-- Migration 0007: PostgreSQL Full-Text Search and Trigram Indexing

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Add text search indexes for inventory parts & part numbers (SKU)
CREATE INDEX IF NOT EXISTS idx_parts_fts ON parts USING gin (
    to_tsvector('english', name || ' ' || sku || ' ' || COALESCE(description, ''))
);

-- Add text search indexes for machine details, parameters & serials
CREATE INDEX IF NOT EXISTS idx_devices_fts ON devices USING gin (
    to_tsvector('english', device_type || ' ' || COALESCE(brand, '') || ' ' || COALESCE(model, '') || ' ' || COALESCE(serial_number, ''))
);

-- Add text search indexes for job cards & service reports
CREATE INDEX IF NOT EXISTS idx_job_cards_fts ON job_cards USING gin (
    to_tsvector('english', job_card_code || ' ' || COALESCE(technician_name, '') || ' ' || COALESCE(work_done, '') || ' ' || COALESCE(service_report, ''))
);

-- Add text search indexes for documentation, manuals & blog posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_fts ON blog_posts USING gin (
    to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || body_md)
);

-- Add search index for serialized inventory items
CREATE INDEX IF NOT EXISTS idx_serialized_items_fts ON serialized_items USING gin (
    to_tsvector('english', serial_number || ' ' || COALESCE(recall_reason, ''))
);
