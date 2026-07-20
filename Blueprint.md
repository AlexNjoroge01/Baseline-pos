# Blueprint: Duka POS System

Status: planning document, written before implementation. Section 12 should be updated to reflect reality once built.

---

## 1. Overview

A single Next.js 14+ (App Router) full-stack app that runs a POS for a Kenyan general shop. Postgres on Neon via Drizzle ORM. Passwordless staff login (magic link via Resend) plus a bcrypt-hashed PIN quick-switch for cashiers sharing one till. Receipts are PDFs (`@react-pdf/renderer`), emailed via Resend and downloadable — no physical printer integration in this phase.

Nine sections: Dashboard, Products, Categories, Inventory, Sales (POS), Customers, Reports, Users & Roles, Settings.

---

## 2. Environment Setup

`.env.example`:
```
DATABASE_URL=
DATABASE_URL_UNPOOLED=
RESEND_API_KEY=
EMAIL_FROM="Duka POS <receipts@yourdomain.com>"
AUTH_SECRET=
APP_URL=http://localhost:3000
```

Install:
```bash
npx create-next-app@latest duka-pos --typescript --tailwind --app
cd duka-pos
npm install drizzle-orm @neondatabase/serverless drizzle-kit axios sonner \
  react-hook-form @hookform/resolvers zod resend recharts date-fns \
  bcryptjs @react-pdf/renderer
npx shadcn@latest init
npx shadcn@latest add button input form dialog sheet table dropdown-menu \
  select tabs card badge sonner calendar popover command avatar skeleton \
  separator alert-dialog
```

`drizzle.config.ts` points at `DATABASE_URL_UNPOOLED` for migrations; the app itself uses `DATABASE_URL` (pooled) at runtime.

---

## 3. Folder Structure

```
duka-pos/
  app/
    (auth)/login/page.tsx
    (auth)/api/auth/request-link/route.ts      # POST: create + email magic link
    (auth)/api/auth/verify/route.ts            # GET: consume token, set session
    (app)/dashboard/page.tsx
    (app)/products/page.tsx
    (app)/categories/page.tsx
    (app)/inventory/page.tsx
    (app)/pos/page.tsx
    (app)/customers/page.tsx
    (app)/customers/[id]/page.tsx
    (app)/reports/page.tsx
    (app)/users/page.tsx
    (app)/settings/page.tsx
    (app)/layout.tsx                           # role-gated nav shell
    api/receipts/[saleId]/pdf/route.ts         # GET: stream PDF
    api/reports/export/route.ts                # GET: CSV export
  actions/
    auth.ts            # requestMagicLink, verifyToken helpers used by routes
    products.ts         # createProduct, updateProduct, toggleActive
    categories.ts
    inventory.ts         # adjustStock()
    sales.ts             # createSale() — the checkout transaction
    customers.ts
    users.ts             # inviteUser, setRole, resetPin, deactivate
    settings.ts
  db/
    schema.ts
    index.ts             # drizzle() client setup (neon-http + neon-serverless)
    seed.ts
  lib/
    auth-session.ts       # requireSession(), requireRole()
    money.ts              # formatKES(), toCents(), fromCents()
    receipt-pdf.tsx        # React-PDF document component + render()
    email.ts              # Resend wrappers: sendMagicLink(), sendReceipt()
  components/
    ui/                    # shadcn primitives
    pos/                   # ProductGrid, Cart, PaymentPanel, PinSwitchDialog
    charts/                # SalesTrendChart, CategoryBreakdownChart
  public/
    seed-products/*.svg
```

---

## 4. Database Schema (`db/schema.ts`)

```ts
import { pgTable, pgEnum, uuid, text, numeric, integer, boolean,
  timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "manager", "cashier"]);
export const unitEnum = pgEnum("unit", ["piece", "kg", "g", "litre", "ml", "pack"]);
export const movementTypeEnum = pgEnum("movement_type",
  ["restock", "sale", "adjustment", "return", "waste"]);
export const referenceTypeEnum = pgEnum("reference_type", ["sale", "manual"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "mpesa", "card"]);
export const saleStatusEnum = pgEnum("sale_status", ["completed", "refunded", "voided"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default("cashier"),
  pinHash: text("pin_hash"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").unique(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  unit: unitEnum("unit").notNull().default("piece"),
  priceCents: integer("price_cents").notNull(),
  costPriceCents: integer("cost_price_cents").notNull().default(0),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("16.00"),
  imageUrl: text("image_url"),
  reorderLevel: integer("reorder_level").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inventoryLevels = pgTable("inventory_levels", {
  productId: uuid("product_id").references(() => products.id).primaryKey(),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  type: movementTypeEnum("type").notNull(),
  quantityDelta: integer("quantity_delta").notNull(), // signed
  referenceType: referenceTypeEnum("reference_type").notNull(),
  referenceId: uuid("reference_id"),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(), // E.164, +2547XXXXXXXX
  email: text("email"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  totalSpentCents: integer("total_spent_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(), // INV-000123
  customerId: uuid("customer_id").references(() => customers.id),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  taxTotalCents: integer("tax_total_cents").notNull(),
  discountTotalCents: integer("discount_total_cents").notNull().default(0),
  grandTotalCents: integer("grand_total_cents").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentReference: text("payment_reference"),
  status: saleStatusEnum("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").references(() => sales.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(), // snapshot at sale time
  quantity: integer("quantity").notNull(),
  lineSubtotalCents: integer("line_subtotal_cents").notNull(),
  lineTaxCents: integer("line_tax_cents").notNull(),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").references(() => sales.id).notNull().unique(),
  pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true }),
  emailedTo: text("emailed_to"),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopName: text("shop_name").notNull().default("My Duka"),
  shopAddress: text("shop_address"),
  shopPhone: text("shop_phone"),
  shopEmail: text("shop_email"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("KES"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("16.00"),
  receiptFooterNote: text("receipt_footer_note").default("Asante kwa kununua nasi!"),
  lowStockThresholdDefault: integer("low_stock_threshold_default").notNull().default(5),
});

// Relations (abbreviated — define both directions for every fk above)
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  inventory: one(inventoryLevels, { fields: [products.id], references: [inventoryLevels.productId] }),
  movements: many(stockMovements),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  cashier: one(users, { fields: [sales.cashierId], references: [users.id] }),
  items: many(saleItems),
  receipt: one(receipts, { fields: [sales.id], references: [receipts.saleId] }),
}));
```

> Note: prices stored as integer cents (`priceCents`, etc.) per the "no float math on money" rule — `lib/money.ts` converts to/from KES display strings.

---

## 5. Auth Implementation Notes

**`actions/auth.ts`**
- `requestMagicLink(email)`: look up user (must exist + be active, or be a pending invite); generate 32-byte random token; store `sha256(token)` in `magic_link_tokens` with 15-min expiry; call `sendMagicLink()` with the raw token embedded in `${APP_URL}/api/auth/verify?token=...`.
- `verifyToken(token)`: hash incoming token, find matching unconsumed/non-expired row, mark `consumedAt`, create `sessions` row (7-day expiry), return session id to set as httpOnly cookie.

**`lib/auth-session.ts`**
- `getSession()`: reads cookie, loads session + user, returns `null` if missing/expired.
- `requireSession()`: throws/redirects to `/login` if no session.
- `requireRole(...roles)`: throws 403 if `session.user.role` not in `roles`. Used at the top of every admin-only server action and page.

**PIN quick-switch**: client component `PinSwitchDialog` posts to a server action `verifyPin(userId, pin)` that does `bcrypt.compare(pin, user.pinHash)`; on success, sets "active cashier for this terminal" in a short-lived cookie (separate from the main session cookie) read by the POS checkout action to stamp `cashierId`.

---

## 6. Route Map

| Route | Type | Access | Purpose |
|---|---|---|---|
| `/login` | page | public | request magic link |
| `/api/auth/request-link` | route handler POST | public | issue token + email |
| `/api/auth/verify` | route handler GET | public | consume token, set session |
| `/dashboard` | page | any authenticated | KPI cards + charts |
| `/products` | page | manager+ (cashier read-only) | product CRUD |
| `/categories` | page | manager+ | category CRUD |
| `/inventory` | page | manager+ | stock levels + adjustments |
| `/pos` | page | cashier+ | checkout screen |
| `/customers`, `/customers/[id]` | page | cashier+ | customer CRUD + history |
| `/reports` | page | manager+ | analytics + CSV export |
| `/users` | page | admin only | invite/role/PIN management |
| `/settings` | page | admin only | shop profile + defaults |
| `/api/receipts/[saleId]/pdf` | route handler GET | cashier+ | stream receipt PDF |
| `/api/reports/export` | route handler GET | manager+ | CSV stream |

---

## 7. Checkout Transaction (`actions/sales.ts` → `createSale()`)

Pseudocode inside a single Drizzle transaction:
```
1. re-fetch each cart line's product + inventoryLevels row (row lock / re-check quantityOnHand)
2. if any line's requested qty > quantityOnHand → throw InsufficientStockError(productName)
3. compute subtotal/tax/discount/grandTotal in cents
4. insert sales row (invoiceNumber = next sequence, e.g. INV-000123)
5. insert sale_items rows (snapshot unitPriceCents from product at this moment)
6. for each line: adjustStock(productId, -qty, type: "sale", referenceId: saleId, createdBy: cashierId)
7. if customerId: increment customers.totalSpentCents, loyaltyPoints (e.g. 1 pt per 100 KES)
8. commit transaction
9. (outside/after commit) render PDF, insert receipts row, email if customer.email exists
10. return { sale, pdfUrl }
```

`adjustStock()` (used here and from `/inventory`) always: updates `inventoryLevels.quantityOnHand` + inserts a `stockMovements` row, both inside the caller's transaction.

---

## 8. Receipt PDF (`lib/receipt-pdf.tsx`)

- A `@react-pdf/renderer` `<Document>` component `ReceiptDocument({ sale, items, customer, shopSettings })`.
- Layout: header (shop name/logo/address), `Invoice: INV-000123`, date in Africa/Nairobi (format via date-fns + fixed +03:00 offset — Kenya has no DST), cashier name, item table, totals block, payment method + reference, footer note.
- `renderReceiptPdf(saleId)` in `lib/email.ts`/route handler: loads sale + items + customer + settings, renders to Buffer via `renderToBuffer()`, upserts `receipts` row, returns buffer for both the download route and the email attachment.

---

## 9. Seed Plan (`db/seed.ts`)

Run order: settings row → categories → products (+ generate SVG placeholders into `/public/seed-products/`) → inventory_levels → users (1 admin, 2 cashiers with bcrypt-hashed PINs, printed to console on first run) → customers → backdated sales/sale_items/stock_movements spanning ~7 days so Dashboard/Reports aren't empty on first load.

Placeholder SVG generation: simple function that draws a colored rounded-rect (color keyed to category) with the product's initials centered, written per product — no external network calls, so seeding never breaks on a flaky connection.

Categories/products/pricing: as listed in the original brief (Grains & Flour, Cooking Essentials, Beverages, Dairy & Bread, Household & Cleaning, Personal Care, Snacks & Confectionery; ~25–30 SKUs with realistic KES pricing; 3–4 seeded below their reorder level).

---

## 10. Non-Functional Checklist

- [ ] All money as integer cents; `formatKES()` is the only place that renders currency strings.
- [ ] Every Server Action re-validates its Zod schema server-side, independent of the client form.
- [ ] Every mutation wrapped in try/catch → Sonner toast; buttons show pending state (`useFormStatus`/`isPending`).
- [ ] `/pos` tested at a tablet viewport (e.g. 1024×768 landscape).
- [ ] No `RESEND_API_KEY` or DB client ever imported into a `"use client"` file.
- [ ] Soft-delete (`isActive`) everywhere a row could be referenced by historical sales.

---

## 11. Build Order

1. Scaffold + Tailwind + shadcn + Drizzle/Neon wiring + `.env.example`.
2. Schema + migration + seed script, verified via Drizzle Studio.
3. Magic-link auth + session cookie + role-gated layout shell (nav for all 9 sections, even as stubs).
4. Categories + Products CRUD.
5. Inventory view + `adjustStock()` + stock_movements.
6. Customers CRUD.
7. POS screen + `createSale()` transaction + PDF + email.
8. Dashboard (needs real sales data from step 7).
9. Reports + CSV export.
10. Users & Roles + Settings.
11. Re-read this file against what was actually built; update any section that drifted.

---

## 12. As-Built Notes

Built on the pre-scaffolded repo (Next 16 / React 19 / Tailwind v4). Deviations from the plan above, and why:

### Stack differences vs. the plan
- **Next.js 16.2.6 (Turbopack), React 19.2.4, Tailwind v4** — not the Next 14 / Tailwind v3 the plan assumed. Consequences:
  - No `tailwind.config.ts`. Tailwind v4 is configured entirely in `app/globals.css` via `@theme inline`. The Design.md palette (given as HSL triplets for v3) was ported into `globals.css` as `hsl(...)` custom properties + semantic tokens; retheming still means editing the one raw-scale block.
  - `cookies()`, and dynamic-route `params`, are async (awaited everywhere).
- **Fonts** via `next/font/google` (Space Grotesk / Inter / JetBrains Mono) wired to `--font-display` / `--font-sans` / `--font-figures`, replacing the `@import` in Design.md §7 (avoids a render-blocking request; Design.md §9 anticipated this swap).
- **Icons: `@hugeicons/react`** (installed), not `lucide-react`. Same nav/semantics.
- **DB driver:** `drizzle-orm/neon-serverless` with a `Pool` (+ `ws`) rather than `neon-http`, because the checkout needs a real interactive transaction. Added deps: `ws`, `@types/ws`, and `tsx` (seed/migration runner).
- **Time zone:** implemented with the built-in `Intl` API pinned to `Africa/Nairobi` (`lib/datetime.ts`) instead of `date-fns-tz` (not installed) — Kenya has no DST, so a fixed zone is exact.

### Structural notes
- **Server-action export rule:** files with `"use server"` may only export async, serialisable actions. So `adjustStockTx` + `InsufficientStockError` (which take a live tx handle) live in `lib/inventory-core.ts`; `actions/inventory.ts` only exports the `adjustStock` action. `createSale` imports the core helper.
- **Auth request path:** `/login` calls the `requestMagicLink` server action directly; the `/api/auth/request-link` route in the plan was not needed. `/api/auth/verify` (GET) remains, since it's a link click.
- **Appearance propagation:** the root layout reads prefs from the `theme-prefs` cookie (written alongside the DB row by `updateAppearanceSettings`), not from the DB — no DB round-trip / no flash of old theme, and the layout renders even without a DB.
- **`server-only`** package isn't installed, so its guard import was dropped from `lib/auth-session.ts` (DB access is still confined to server files).
- **Forms** use controlled inputs + shadcn `Label` with `react-hook-form`/Zod-style validation done server-side via shared schemas in `lib/validations.ts`; the shadcn `Form` wrapper wasn't part of the installed `radix-maia` registry. Every action re-validates with Zod regardless of the client.

### How to run
1. `cp .env.example .env` and fill `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Neon), `AUTH_SECRET`, `APP_URL`; `RESEND_API_KEY` optional (magic links + receipts are logged to the server console when absent).
2. `pnpm db:push` (or `db:generate` + `db:migrate`) — migrations are generated in `db/migrations/`.
3. `pnpm db:seed` — creates a shop, 7 categories, 29 products (with generated SVG placeholders in `public/seed-products/`), 3 staff (admin + 2 cashiers, PINs printed to console), 4 customers, and ~30 backdated sales across 7 days. Re-runnable (wipes first).
4. `pnpm dev`, sign in at `/login` with a seeded email (magic link appears in the server console if Resend isn't configured).

### Verified
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` all pass (16 routes, all correctly dynamic). Live DB behaviour not exercised here (no Neon credentials in this environment).

### Package pins actually used
Next 16.2.6, React 19.2.4, drizzle-orm 0.45.2, drizzle-kit 0.31.10, @neondatabase/serverless 1.1.0, @react-pdf/renderer 4.5.1, zod 4.4.3, recharts 3.9.2, bcryptjs 3.0.3, resend 6.17.2, ws 8.21.1, tsx 4.23.1.`