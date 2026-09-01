# Indie Tech Services — E-Commerce & Hardware Repair Platform

An end-to-end e-commerce, preventive/corrective maintenance booking, spare parts store, technician machine job card tracking, and analytics system. Built for independent technicians and hardware repair businesses.

---

## 🏗 Architecture Overview

The system consists of two main applications:

1. **`indie-tech-api`**: High-performance RESTful API written in **Go 1.22 (Echo v4 framework)**, connecting directly to a **PostgreSQL database** via `pgxpool`. Integrates **M-Pesa Daraja API** for payments and **WhatsApp Cloud API** for client notification updates.
2. **`indie-tech-portal`**: Modern client-facing portal built with **React.js + Vite (TypeScript & Tailwind CSS)**. Supports no-account repair booking, M-Pesa storefront checkout, job card lookup, service report views, and knowledge base articles.

*For detailed database schema, relationships, foreign keys, and ERD cardinalities, see [`DATABASE.md`](./DATABASE.md).*

---

## 🚀 Features Implemented

### 1. E-Commerce Storefront & M-Pesa Checkout
- **Service Packages Catalog**: Recurring & one-off maintenance packages (Monthly SLA, diagnostic visits, network checkups).
- **Spare Parts Catalog**: Real-time stock counts for replacement parts (thermal print heads, fuser sleeves, CISS kits).
- **M-Pesa STK Push Integration**: Native Daraja API integration to initiate Till / Buy Goods STK prompts on customer phones.
- **Automated Stock Decrements**: Inventory auto-decrements upon confirmed payment via M-Pesa webhooks.

### 2. Service Booking: Preventive vs. Corrective Maintenance
- **Preventive Maintenance**: Scheduled routine inspections, cleaning, and health checks to prevent hardware failure.
- **Corrective Maintenance**: Immediate diagnostic and repair requests for broken machines or active faults.
- **Client Upsert**: Frictionless booking using phone numbers—no account creation required.

### 3. Machine Management & Job Cards
- **Device & Machine Tracking**: Auto-provisions customer machines with brand, model, device type, and serial number / asset tag.
- **Technician Job Cards**: Unique job card generation (`JOB-XXXXX`) tied to repair tickets and customer machines.
- **Work & Parts Tracking**: Log work performed, technician assigned, parts installed, and resolution status.
- **Official Service Reports**: Publicly accessible digital service report view for clients.

### 4. Unified Inventory Serialization, Procurement & Deployments
- **Procurement & Receiving**: Purchase order line creation, supplier tracking, and receipt processing spawning serialized `item_units` with locked unit cost (`unit_cost_kes`).
- **Machine Component Nesting**: Track parts installed inside machines (`machine_components`).
- **Asset Deployments**: Equipment handoffs to clients or technicians (`deployments`).
- **Unit Transactions Ledger**: Immutable transactional audit trail (`unit_transactions`).
- **Product Recall Triggers**: Technician admin API to flag defective batches/serials with recall reasons.

### 5. PostgreSQL Full-Text Search
- **System Search Engine**: `pg_trgm` and `tsvector` indexing across spare parts, machine details/serials, job cards, and technical manuals.

### 6. Reliability & MTBF Analytics
- **Mean Time Between Failures (MTBF)**: Calculated MTBF per machine model via `analytics.mv_mtbf_by_model`.
- **Supplier Quality Tracking**: Supplier defect and failure rate percentages via `analytics.mv_supplier_failure_rates`.
- **Telemetry**: Tracking of clicks, purchases, recalls, and article views (`GET /api/v1/telemetry/stats`).

---

## 🛠 Prerequisites

- **Go**: 1.22 or higher
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher

---

## ⚙️ Running the System

### Step 1: Database Setup & Migrations

1. Ensure PostgreSQL is running and create the database:
   ```bash
   createdb indietech
   ```

2. Run the SQL migration scripts in order:
   ```bash
   psql -d indietech -f indie-tech-api/internal/db/migrations/0001_init.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0002_seed_packages.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0003_parts.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0004_seed_parts.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0005_seed_blog.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0006_advanced_features.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0007_pg_search.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0008_inventory_engine.sql
   psql -d indietech -f indie-tech-api/internal/db/migrations/0009_consolidate_inventory.sql
   ```

---

### Step 2: Backend Setup (`indie-tech-api`)

1. Navigate to the API directory:
   ```bash
   cd indie-tech-api
   ```

2. Configure environment variables (`.env`):
   ```bash
   cp .env.example .env
   ```
   Set your `DATABASE_URL` (e.g. `postgres://postgres:password@localhost:5432/indietech?sslmode=disable`).

3. Download dependencies and run the Go API server:
   ```bash
   go mod download
   go run cmd/server/main.go
   ```
   *The server will start on http://localhost:8080.*

---

### Step 3: Frontend Setup (`indie-tech-portal`)

1. Open a new terminal and navigate to the portal directory:
   ```bash
   cd indie-tech-portal
   ```

2. Configure environment variables (`.env.local`):
   ```bash
   cp .env.local.example .env.local
   ```
   Ensure `VITE_API_BASE_URL=http://localhost:8080`.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the React + Vite development server:
   ```bash
   npm run dev
   ```
   *Visit http://localhost:3000 in your browser.*

---

## 🧪 Testing & Production Build

### Backend Tests:
```bash
cd indie-tech-api
go test ./...
go build ./...
```

### Frontend Production Build:
```bash
cd indie-tech-portal
npm run build
```
