# Database Entity Relationships & Schema Specification

This document explicitly defines all database tables, foreign key constraints, and entity relationship cardinalities for the platform.

---

## 📐 ERD Cardinalities & Relationships Overview

```
[suppliers] (1) ─── (N) [po_lines] (1) ─── (N) [receipts] (1) ─── (N) [item_units]
   │                                                                     │
   │                                                                     ├─ (1) ─── (N) [machine_components] ─── (N) ─── (1) [devices]
   │                                                                     ├─ (1) ─── (N) [deployments] ─── (N) ─── (0..1) [clients]
   │                                                                     ├─ (1) ─── (N) [failure_events] ─── (N) ─── (1) [devices]
   │                                                                     └─ (1) ─── (N) [unit_transactions]
   │
   └─ (1) ─── (N) [price_history] ─── (N) ─── (1) [parts]

[clients] (1) ─── (N) [devices] (1) ─── (N) [tickets] (1) ─── (N) [ticket_events]
   │                                           │
   │                                           └─ (1) ─── (N) [job_cards]
   │
   └─ (1) ─── (N) [orders] ─── (0..1) ─── [parts / service_packages]
```

---

## 🗂 Detailed Table Relationships & Constraints

### 1. Procurement & Receiving Context
- **`suppliers`**
  - Primary Key: `id` (UUID)
  - Relationships:
    - 1 : N with `po_lines` (`po_lines.supplier_id` -> `suppliers.id` ON DELETE CASCADE)
    - 1 : N with `price_history` (`price_history.supplier_id` -> `suppliers.id` ON DELETE SET NULL)

- **`po_lines`**
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `supplier_id` -> `suppliers.id` (ON DELETE CASCADE)
    - `part_id` -> `parts.id` (ON DELETE CASCADE)
  - Relationships:
    - 1 : N with `receipts` (`receipts.po_line_id` -> `po_lines.id` ON DELETE CASCADE)

- **`receipts`**
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `po_line_id` -> `po_lines.id` (ON DELETE CASCADE)
  - Relationships:
    - 1 : N with `item_units` (`item_units.receipt_id` -> `receipts.id` ON DELETE SET NULL)

---

### 2. Inventory & Serialization Context
- **`parts`** (Master Parts Catalog)
  - Primary Key: `id` (UUID)
  - Unique Key: `sku`
  - Relationships:
    - 1 : N with `item_units` (`item_units.part_id` -> `parts.id` ON DELETE CASCADE)
    - 1 : N with `po_lines` (`po_lines.part_id` -> `parts.id` ON DELETE CASCADE)
    - 1 : N with `price_history` (`price_history.part_id` -> `parts.id` ON DELETE CASCADE)

- **`item_units`** (Serialized Units with locked `unit_cost_kes`)
  - Primary Key: `id` (UUID)
  - Unique Key: `serial_number`
  - Foreign Keys:
    - `part_id` -> `parts.id` (ON DELETE CASCADE)
    - `receipt_id` -> `receipts.id` (ON DELETE SET NULL)
  - Relationships:
    - 1 : N with `machine_components` (`machine_components.item_unit_id` -> `item_units.id`)
    - 1 : N with `deployments` (`deployments.item_unit_id` -> `item_units.id`)
    - 1 : N with `failure_events` (`failure_events.failed_unit_id` -> `item_units.id`)
    - 1 : N with `unit_transactions` (`unit_transactions.item_unit_id` -> `item_units.id`)

- **`unit_transactions`** (Immutable Inventory Ledger)
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `item_unit_id` -> `item_units.id` (ON DELETE CASCADE)

---

### 3. Customer, Machine & Ticket Context
- **`clients`**
  - Primary Key: `id` (UUID)
  - Unique Key: `phone`
  - Relationships:
    - 1 : N with `devices` (`devices.client_id` -> `clients.id` ON DELETE CASCADE)
    - 1 : N with `tickets` (`tickets.client_id` -> `clients.id` ON DELETE CASCADE)
    - 1 : N with `orders` (`orders.client_id` -> `clients.id` ON DELETE CASCADE)

- **`devices`** (Customer Machines)
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `client_id` -> `clients.id` (ON DELETE CASCADE)
  - Relationships:
    - 1 : N with `tickets` (`tickets.device_id` -> `devices.id` ON DELETE SET NULL)
    - 1 : N with `machine_components` (`machine_components.device_id` -> `devices.id`)
    - 1 : N with `failure_events` (`failure_events.device_id` -> `devices.id`)
    - 1 : N with `job_cards` (`job_cards.device_id` -> `devices.id`)

- **`tickets`** (Preventive & Corrective Maintenance Requests)
  - Primary Key: `id` (UUID)
  - Unique Key: `ticket_code`
  - Foreign Keys:
    - `client_id` -> `clients.id` (ON DELETE CASCADE)
    - `device_id` -> `devices.id` (ON DELETE SET NULL)
  - Relationships:
    - 1 : N with `ticket_events` (`ticket_events.ticket_id` -> `tickets.id` ON DELETE CASCADE)
    - 1 : N with `job_cards` (`job_cards.ticket_id` -> `tickets.id` ON DELETE CASCADE)
    - 1 : N with `failure_events` (`failure_events.ticket_id` -> `tickets.id` ON DELETE SET NULL)

- **`job_cards`** (Technician Work Log & Service Reports)
  - Primary Key: `id` (UUID)
  - Unique Key: `job_card_code`
  - Foreign Keys:
    - `ticket_id` -> `tickets.id` (ON DELETE CASCADE)
    - `device_id` -> `devices.id` (ON DELETE SET NULL)

---

### 4. Deployments, Components & Reliability Context
- **`machine_components`** (Parts installed inside machines)
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `device_id` -> `devices.id` (ON DELETE CASCADE)
    - `item_unit_id` -> `item_units.id` (ON DELETE CASCADE)

- **`deployments`** (Equipment handed off to technicians/clients)
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `item_unit_id` -> `item_units.id` (ON DELETE CASCADE)
    - `client_id` -> `clients.id` (ON DELETE SET NULL)

- **`failure_events`** (MTBF & Defect Tracking)
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `device_id` -> `devices.id` (ON DELETE CASCADE)
    - `failed_unit_id` -> `item_units.id` (ON DELETE CASCADE)
    - `replacement_unit_id` -> `item_units.id` (ON DELETE SET NULL)
    - `ticket_id` -> `tickets.id` (ON DELETE SET NULL)

---

### 5. E-Commerce & Telemetry Context
- **`orders`**
  - Primary Key: `id` (UUID)
  - Foreign Keys:
    - `client_id` -> `clients.id` (ON DELETE CASCADE)
    - `item_ref` -> `parts.id` or `service_packages.id`

- **`service_packages`**
  - Primary Key: `id` (UUID)

- **`telemetry_events`**
  - Primary Key: `id` (UUID)
  - Polymorphic Target: `target_type` ('part' | 'package' | 'blog_post') and `target_id`

- **`blog_posts`** (Technical Service Guides & Manuals)
  - Primary Key: `id` (UUID)
  - Unique Key: `slug`
