# Duka POS

A full-stack point-of-sale system for a Kenyan general shop ("duka"), built as a single Next.js app. It covers the complete retail flow: catalog management, live inventory with an audit trail, a tablet-first checkout till, customer loyalty, PDF receipts, staff management with role-gated access, and a voice assistant that can drive the till.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-Postgres-green)

## Features

- **POS checkout** (`/pos`) — fast cart-based till with automatic pricing, tax (16% VAT default), and discounts. Every checkout runs in a single DB transaction that re-checks stock and snapshots prices.
- **M-Pesa STK Push** — real Safaricom Daraja integration: push a payment prompt to the customer's phone, poll for confirmation, and only then create the sale (frozen cart snapshot, idempotent, no double-charging).
- **Voice assistant (ElevenLabs)** — an AI agent scoped to the POS page. Search products, manage the cart, initiate cash or M-Pesa payments by voice. All tool calls go through the same server actions and session auth as clicks; the LLM never sets a price or stock level.
- **Inventory management** — stock levels, reorder levels, low-stock surfacing, and a full stock-movement audit trail (restock, sale, adjustment, return, waste).
- **Products & categories** — full CRUD with units (piece, kg, litre, …), barcodes, cost/price tracking, and generated product images.
- **Customers & loyalty** — customer records (E.164 phone), loyalty points, total spend, purchase history, and emailed receipts.
- **Reports & analytics** — revenue trends, top products, payment breakdowns, and CSV export for accountants.
- **PDF receipts** — rendered server-side with `@react-pdf/renderer`, downloadable and emailable, with an `INV-000123`-style invoice ledger clean enough to line up like an exercise book.
- **Passwordless auth** — magic links via email plus bcrypt-hashed PIN quick-switch for cashiers sharing one till.
- **Users & roles** — `admin` / `manager` / `cashier` roles enforced server-side on every page and action.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI, HugeIcons |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Auth | Magic links (session cookies) + PIN quick-switch, tokens hashed with SHA-256, passwords with bcrypt |
| Email | Resend (magic links + receipts) |
| Payments | Safaricom Daraja (M-Pesa STK Push) |
| Voice | ElevenLabs Conversational AI (`@elevenlabs/react`) |
| PDF | `@react-pdf/renderer` |
| Charts | Recharts |

All money is stored as integer cents — no float math. Display formatting goes exclusively through `lib/money.ts`.

## Prerequisites

- **Node.js 20.9+**
- **pnpm** (`corepack enable` or `npm install -g pnpm`)
- A **Neon** Postgres database (free tier works fine) — grab the pooled and unpooled connection strings from the Neon dashboard
- Optional: Resend API key, Safaricom Daraja sandbox credentials, ElevenLabs API key

## Getting started

```bash
# 1. Clone and install
git clone <this-repo>
cd Baseline-POS
pnpm install

# 2. Configure environment
cp .env.example .env
```

Fill in `.env`:

```bash
# Postgres (Neon) — required
# Pooled URL is used by the app at runtime
DATABASE_URL=postgresql://...?sslmode=require
# Unpooled (direct) URL — migrations run against this
DATABASE_URL_UNPOOLED=postgresql://...

# Auth — required (any long random string, e.g. `openssl rand -base64 32`)
AUTH_SECRET=
APP_URL=http://localhost:3000

# Email (magic links + receipts) — optional in dev.
# When unset, magic links and receipts are logged to the server console instead.
RESEND_API_KEY=
EMAIL_FROM="Duka POS <receipts@yourdomain.com>"
```

That's the minimum. The app runs fine without Resend, M-Pesa, or ElevenLabs — see [Optional integrations](#optional-integrations).

```bash
# 3. Create the schema (generates db/migrations/ and applies them)
pnpm db:generate
pnpm db:migrate
# — or the shortcut —
pnpm db:push

# 4. Seed demo data
pnpm db:seed

# 5. Run it
pnpm dev
```

Open <http://localhost:3000>. You'll land on the marketing page; sign in at `/login`.

### Seeded accounts

`pnpm db:seed` is re-runnable (it wipes and rebuilds first) and creates:

| Name | Email | Role | PIN |
|---|---|---|---|
| Store Owner | `owner@bidiistore.co.ke` | admin | `2468` |
| Grace Wambui | `grace@bidiistore.co.ke` | cashier | `1234` |
| Peter Kimani | `peter@bidiistore.co.ke` | cashier | `5678` |

Sign in by entering a seeded email on `/login` — without a Resend key, the magic link is printed to your dev server console; click it (or just visit the `/api/auth/verify?token=...` URL) to start a 7-day session. On the POS page you can also quick-switch between staff with their PINs.

The seed also creates a shop profile, 7 categories, 29 products, 4 customers, and ~30 backdated sales across the last 7 days, so the dashboard and reports are populated on first load.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) at `localhost:3000` |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier (TS/TSX files) |
| `pnpm db:generate` | Generate Drizzle migration SQL from `db/schema.ts` |
| `pnpm db:migrate` | Apply migrations (uses the unpooled URL) |
| `pnpm db:push` | Push the schema straight to the DB (dev shortcut) |
| `pnpm db:studio` | Open Drizzle Studio to browse data |
| `pnpm db:seed` | Wipe + repopulate demo data |
| `pnpm db:images` | Generate placeholder product images |
| `pnpm voice:setup` | Provision the ElevenLabs voice agent (needs `ELEVENLABS_API_KEY`) |

## Optional integrations

### Resend (email)

Set `RESEND_API_KEY` and `EMAIL_FROM` to send magic links and receipt emails for real. Ensure `EMAIL_FROM` uses a domain you've verified in Resend.

### M-Pesa (Safaricom Daraja STK Push)

Create a free sandbox account at [developer.safaricom.co.ke](https://developer.safaricom.co.ke), create an app, and grab your credentials:

```bash
DARAJA_ENV=sandbox
DARAJA_CONSUMER_KEY=...
DARAJA_CONSUMER_SECRET=...
DARAJA_SHORTCODE=...
DARAJA_PASSKEY=...
MPESA_CALLBACK_BASE_URL=https://your-public-url
```

> `MPESA_CALLBACK_BASE_URL` must be an HTTPS URL Safaricom can reach — an ngrok tunnel in dev or your deployed domain. Safaricom can't reach `localhost`. Without it, M-Pesa still works: the app actively polls payment status instead of relying on the passive callback.

Voice-initiated and manual M-Pesa payment are unavailable and fail with a clear error until the Daraja vars are set.

### ElevenLabs voice assistant

1. Get an API key from [ElevenLabs](https://elevenlabs.io) and set `ELEVENLABS_API_KEY`.
2. Run `pnpm voice:setup` — it provisions the agent and its tools via the ElevenLabs API and prints an agent ID.
3. Put the printed ID in `ELEVENLABS_AGENT_ID`.

`ELEVENLABS_API_KEY` is used server-side only; the browser gets a short-lived signed URL minted by a session-gated route (`/api/voice/signed-url`), so only signed-in staff can use voice.

## Project structure

```
app/
  (auth)/login/          # Magic-link sign-in
  (app)/dashboard/       # KPI cards + charts
  (app)/pos/             # The till: cart, payments, voice assistant
  (app)/products/        # Product CRUD
  (app)/categories/      # Category CRUD
  (app)/inventory/       # Stock levels + adjustments
  (app)/customers/       # Customers, loyalty, history
  (app)/reports/         # Analytics + CSV export
  (app)/users/           # Staff, invites, roles, PINs (admin)
  (app)/settings/        # Shop profile + defaults (admin)
  api/                   # auth verify, PDF receipts, CSV export,
                         # M-Pesa callback, voice signed URL
actions/                 # "use server" mutations (Zod-validated)
db/                      # Drizzle schema, migrations, seed
lib/                     # money, auth session, pricing, M-Pesa, email,
                         # receipt PDF, datetime helpers
components/              # shadcn ui + pos/ + charts/ + landing/
hooks/                   # Cart, POS-related hooks
scripts/                 # One-time integration provisioning
```

Key routing convention: pages use route groups — `(auth)` is public, everything under `(app)` requires a session and renders inside a role-gated nav shell.

## Design notes

- **Money as cents** — `priceCents`, `grandTotalCents`, etc. `lib/money.ts` (`formatKES`, `toCents`, `fromCents`) is the only place currency strings are rendered.
- **Server is the source of truth** — every server action re-validates with Zod regardless of what the client sent. Checkout re-fetches prices and stock inside one transaction.
- **Soft deletes** — `isActive` flags everywhere a row could be referenced by historical sales.
- **Timezone** — all date display is pinned to `Africa/Nairobi` via `lib/datetime.ts` (Kenya has no DST).
- Detailed design docs live in [`Blueprint.md`](./Blueprint.md) (architecture and as-built notes) and [`Design.md`](./Design.md) (visual system).
