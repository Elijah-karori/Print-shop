# Indie Tech API

Go/Echo backend for the independent hardware/software repair business:
client ticket booking + tracking, M-Pesa STK Push checkout for spare parts
and service packages, and WhatsApp status notifications.

## Stack
- **Go 1.22 + Echo v4** — HTTP framework
- **PostgreSQL** (via pgx) — single source of truth for clients, devices, tickets, orders
- **M-Pesa Daraja API** — STK Push for payments
- **WhatsApp Business Cloud API** — client-facing status notifications
- **JWT** — protects the technician/admin endpoints only; the client-facing
  endpoints (ticket booking, tracking, checkout) are deliberately open —
  clients shouldn't need an account to book a repair.

## Project layout
```
cmd/server/main.go          — entrypoint, dependency wiring
internal/config/            — env var loading
internal/db/                — pgx pool + SQL migrations
internal/models/            — shared structs
internal/handlers/          — HTTP handlers (tickets, orders, mpesa callback)
internal/mpesa/             — Daraja OAuth + STK Push client
internal/notify/            — WhatsApp Business Cloud API sender
internal/middleware/        — JWT auth guard for /admin routes
internal/routes/            — route registration
```

## Setup

1. **Install dependencies**
   ```
   go mod download
   ```

2. **Database**
   ```
   createdb indietech
   psql $DATABASE_URL -f internal/db/migrations/0001_init.sql
   psql $DATABASE_URL -f internal/db/migrations/0002_seed_packages.sql
   psql $DATABASE_URL -f internal/db/migrations/0003_parts.sql
   psql $DATABASE_URL -f internal/db/migrations/0004_seed_parts.sql
   ```

3. **Environment**
   ```
   cp .env.example .env
   # fill in DATABASE_URL, JWT_SECRET, MPESA_*, WHATSAPP_*
   ```

4. **Run**
   ```
   go run cmd/server/main.go
   ```

## API overview

### Public (no auth)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/tickets` | Client books a repair ticket |
| GET | `/api/v1/tickets/lookup?code=&phone=` | Client checks ticket status |
| GET | `/api/v1/packages` | List active service packages (storefront catalog) |
| GET | `/api/v1/parts` | List in-stock spare parts (storefront catalog) |
| POST | `/api/v1/orders/checkout` | Creates an order + triggers M-Pesa STK Push |
| GET | `/api/v1/orders/:id/status` | Poll payment status after STK Push (used by checkout UI) |
| POST | `/api/v1/mpesa/callback` | Safaricom's payment confirmation webhook |

### Admin (Bearer JWT required)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/tickets?status=` | List/filter tickets |
| PATCH | `/api/v1/admin/tickets/:id/status` | Move a ticket through its lifecycle |

## Known stubs / things to fill in before going live

- **M-Pesa token caching**: `getAccessToken` fetches a new OAuth token on
  every STK Push call. Fine for early volume; cache it (token is valid ~1hr)
  once you're doing many transactions a day.
- **WhatsApp template messages**: `SendTicketStatus` sends freeform text,
  which only works within Meta's 24-hour customer-service window. For
  proactive "Ticket Received" messages outside that window you'll need an
  approved message template — same API call shape, different payload.
- **JWT issuance**: there's no `/login` endpoint yet since this is currently
  a single-operator tool — for now, generate a long-lived token manually
  (e.g. a small script using `golang-jwt`) and store it in your admin
  client/Postman. **Planned**: once you bring on other technicians, add a
  real `users` table (email/phone + hashed password or magic link), a
  `/login` endpoint, and put a `technician_id` on tickets so work can be
  assigned/filtered per person — the JWT middleware already in place just
  needs a `sub` claim wired through at that point, no rearchitecture needed.
- **CORS**: `middleware.CORS()` currently allows all origins — restrict
  `AllowOrigins` to your actual frontend domain before launch.
- **Rate limiting**: none yet on the public endpoints — worth adding before
  the blog starts driving traffic, so the ticket/checkout endpoints aren't
  easily spammed.

## Next steps (per the earlier build order)
1. ✅ Core API — clients, devices, tickets (this repo)
2. ✅ M-Pesa STK Push (this repo)
3. ✅ Client-facing ticket portal (Next.js) — phone + ticket-code lookup, no auth
4. Blog (Next.js, markdown-driven via the `blog_posts` table) — no `GET /api/v1/blog`
   endpoint yet either; needs building on both sides
5. WhatsApp webhook verification endpoint (`WHATSAPP_VERIFY_TOKEN`) — needed
   if you later want to receive inbound messages, not just send them
6. ✅ Storefront — service packages (`service_packages` + `/api/v1/packages`)
   and spare parts (`parts` + `/api/v1/parts`) are both real now, each seeded
   with starter data. Stock decrements by 1 automatically when a spare-part
   order is confirmed paid via the M-Pesa callback — see the note in
   `internal/handlers/mpesa_callback.go` about the qty=1 assumption (orders
   have no quantity field yet, so this only works correctly for single-unit
   purchases; add a `quantity` column + checkout field before allowing
   multi-unit orders).

## Migrations
Run in order:
```
psql $DATABASE_URL -f internal/db/migrations/0001_init.sql
psql $DATABASE_URL -f internal/db/migrations/0002_seed_packages.sql
psql $DATABASE_URL -f internal/db/migrations/0003_parts.sql
psql $DATABASE_URL -f internal/db/migrations/0004_seed_parts.sql
```
`0002` and `0004` seed example service packages and spare parts — edit the
SQL files directly (or the DB afterward) to match your real offering and
actual stock counts before running against production.
