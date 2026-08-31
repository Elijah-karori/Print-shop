-- Example service packages so the storefront has real data to list.
-- Edit prices/names to match your actual offering, or manage this table
-- via direct SQL / a future admin endpoint.

INSERT INTO service_packages (name, description, price_kes, cadence, active) VALUES
('One-off Diagnostic Visit', 'On-site fault diagnosis for a single device — printer, POS, or network gear.', 1500.00, 'one_time', true),
('Printer/POS Maintenance — Monthly', 'Monthly preventive maintenance and priority callout for one device.', 2500.00, 'monthly', true),
('Multi-Device SLA — Monthly', 'Covers up to 5 devices at one site with priority same-day response.', 8000.00, 'monthly', true),
('Network Health Check', 'Full audit of MikroTik/router config, signal, and uptime for a small office.', 3500.00, 'one_time', true);
