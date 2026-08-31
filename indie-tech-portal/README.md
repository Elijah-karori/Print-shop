# Indie Tech Portal

Client-facing Next.js app: book a repair ticket and track its status —
no account required (phone number + ticket code only). Talks to the
`indie-tech-api` Go backend.

## Design
- **Palette**: graphite housing background, diagnostic-green accent (status
  ticker "lights"), amber for priority/warnings — deliberately evokes device
  casings and hardware indicator LEDs rather than a generic SaaS look.
- **Type**: Space Mono for headings, labels, and ticket codes; Inter for body copy.
- **Signature element**: `components/StatusTicker.tsx` — a horizontal LED-strip
  progress indicator (received → dispatched → in progress → resolved), with
  the active stage pulsing like a real diagnostic light.

## Setup

```
npm install
cp .env.local.example .env.local
# set NEXT_PUBLIC_API_BASE_URL to your running indie-tech-api instance
npm run dev
```

Visit http://localhost:3000.

## Structure
```
app/
  page.tsx             — landing page
  book/page.tsx        — ticket booking form
  track/page.tsx       — ticket lookup + status display
  shop/page.tsx        — storefront: service packages + spare parts catalog
  shop/checkout/page.tsx — phone entry, STK Push trigger, payment status polling
  layout.tsx           — shared nav/footer, fonts
components/
  TicketForm.tsx        — booking form with client-side validation
  StatusTicker.tsx       — LED-strip ticket status indicator (signature element)
  PaymentStatus.tsx       — single diagnostic-light payment status indicator
lib/
  api.ts                 — typed fetch wrapper for the Go API
```

## API endpoints used
- `POST /api/v1/tickets` — submit a new ticket (book page)
- `GET /api/v1/tickets/lookup?code=&phone=` — check status (track page)
- `GET /api/v1/packages` — list service packages (shop page)
- `GET /api/v1/parts` — list in-stock spare parts (shop page)
- `POST /api/v1/orders/checkout` — trigger M-Pesa STK Push (checkout page)
- `GET /api/v1/orders/:id/status` — poll payment confirmation (checkout page)

All are public/unauthenticated on the backend by design, matching the
"no account needed" flow.

## Known gaps / next steps
- **No blog** — `blog_posts` table exists in the backend but nothing renders
  it yet, and there's no `GET /api/v1/blog` endpoint to call either.
- **Checkout polling has no backend push** — the checkout page polls
  `GET /orders/:id/status` every 3s for up to 2 minutes. That's fine at low
  volume; if this ever needs to feel more real-time, swap in a WebSocket or
  SSE endpoint instead of polling.
- **No quantity selector** — checkout always buys 1 unit. The backend's
  stock decrement assumes qty=1 per order; adding a quantity field means
  updating the checkout form, the `CheckoutInput` type, and the backend's
  `orders` table together.
- **Phone number format**: hard-validated to `2547XXXXXXXX` in both the
  booking form and checkout form. Normalize `07XX...`/`+254...` input in one
  shared helper (e.g. `lib/phone.ts`) if you want to accept those formats,
  rather than duplicating the regex per form.
- **No admin/technician UI** — ticket list and status updates, and any
  future parts/packages management, only exist as API endpoints behind JWT
  auth. Worth its own small internal dashboard once you're managing more
  than a few tickets a day.
