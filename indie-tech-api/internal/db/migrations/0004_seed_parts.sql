-- Starter inventory, matching what was previously hardcoded in the frontend.
-- Edit SKUs/prices/stock to match your actual stock before running against
-- production — these are placeholder quantities.

INSERT INTO parts (sku, name, description, price_kes, stock_qty, active) VALUES
('THERM-HEAD-01', 'Thermal Printer Head', 'Common replacement for POS receipt printers.', 4500.00, 5, true),
('FUSER-FILM-01', 'Fuser Film Sleeve', 'For Kyocera/HP laser printers with fusing errors.', 2200.00, 8, true),
('CISS-KIT-01', 'Continuous Ink System Kit', 'CISS setup for high-volume inkjet printers.', 3800.00, 4, true);
