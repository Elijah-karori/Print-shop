-- Seed blog posts & technician service guides

INSERT INTO blog_posts (slug, title, excerpt, body_md, published_at) VALUES
(
    'thermal-printer-troubleshooting',
    'Troubleshooting Common Thermal Receipt Printer Faults',
    'A step-by-step diagnostic guide for POS thermal printers experiencing faded text, paper jams, or cutter jams.',
    '# Troubleshooting Common Thermal Receipt Printer Faults

Thermal printers are the backbone of modern POS systems. When they stop printing clearly or stall completely, checkout comes to a halt. Here is how we diagnose thermal printer faults in the field.

## 1. Faded or Blurry Printing
- **Cause**: Dirty thermal head or incorrect paper sensitivity.
- **Solution**: Turn off power. Moisten an isopropyl alcohol swab and gently clean the glass line across the thermal print head. Allow 2 minutes to dry before powering on.

## 2. Paper Jams & Feeding Issues
- **Cause**: Debris in the platen roller or worn roller gears.
- **Solution**: Open cover, clear remaining paper fragments. Inspect the rubber platen roller for surface wear or sticky residue. Clean roller with isopropyl alcohol.

## 3. Auto-Cutter Locked Up
- **Cause**: Paper jam during cut or knife mechanism bind.
- **Solution**: Open the front maintenance cover. Manually turn the gear dial on the cutter motor until the blade retracts, allowing paper access.

Need replacement parts? Check our storefront catalog for OEM replacement thermal print heads.',
    NOW()
),
(
    'preventive-maintenance-for-office-printers',
    'Preventive Maintenance Guide for High-Volume Office Printers',
    'Essential monthly checks to extend the lifecycle of laser and inkjet multifunction printers.',
    '# Preventive Maintenance Guide for High-Volume Office Printers

Routine maintenance prevents 80% of premature printer failures. Use this checklist every month:

1. **Clean Paper Pick Rollers**: Wipe rubber rollers with a damp lint-free cloth to restore grip and eliminate multi-sheet feeds.
2. **Vacuum Paper Dust**: Use a dedicated ESD-safe vacuum inside the lower paper cassette and feed path.
3. **Inspect Fuser Assembly**: Check laser printer fuser film sleeves for tears or grease buildup. Replace sleeve if double-image ghosting appears.
4. **Firmware & Network Audit**: Verify static IP assignment and update printer security patches.

Book our monthly preventive maintenance package to have an engineer handle routine servicing automatically.',
    NOW()
);
