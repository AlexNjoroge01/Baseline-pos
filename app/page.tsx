import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ShoppingCart01Icon,
  PackageIcon,
  Analytics01Icon,
  UserMultiple02Icon,
  Invoice01Icon,
  SecurityCheckIcon,
  ArrowRight01Icon,
  Tick02Icon,
  SparklesIcon,
  Store04Icon,
  CloudIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import { getSession } from "@/lib/auth-session"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LandingNav } from "@/components/landing/landing-nav"

const FEATURES: { icon: IconSvgElement; title: string; body: string }[] = [
  {
    icon: ShoppingCart01Icon,
    title: "Fast checkout",
    body: "A tablet-first till that re-checks stock, snapshots prices, and prints a PDF receipt the moment a sale closes.",
  },
  {
    icon: PackageIcon,
    title: "Live inventory",
    body: "Every sale, restock, return and adjustment writes an audit trail. Low-stock items surface before you run out.",
  },
  {
    icon: Analytics01Icon,
    title: "Reports that add up",
    body: "Revenue trends, top products, and payment breakdowns — plus one-click CSV export for your accountant.",
  },
  {
    icon: UserMultiple02Icon,
    title: "Customers & loyalty",
    body: "Track spend and loyalty points, and email receipts automatically to customers who leave an address.",
  },
  {
    icon: Invoice01Icon,
    title: "Ledger-clean receipts",
    body: "Numbers set in a monospaced figure style that line up like a real exercise book — precise, never generic.",
  },
  {
    icon: SecurityCheckIcon,
    title: "Roles & PIN till-switch",
    body: "Passwordless magic-link sign-in for staff, plus a quick PIN switch for cashiers sharing one terminal.",
  },
]

const OFFER_POINTS = [
  "Unlimited products, categories & customers",
  "Cash, M-Pesa and card payments",
  "PDF receipts, emailed automatically",
  "Sales, inventory & CSV reports",
  "Admin, manager & cashier roles",
  "Light / dark and density themes",
]

export default async function LandingPage() {
  const session = await getSession()
  const isAuthed = !!session

  return (
    <div className="scroll-smooth" id="top">
      <LandingNav isAuthed={isAuthed} />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* soft blue wash + hairline grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 75% 0%, color-mix(in oklch, var(--blue-500) 16%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-32 pb-20 md:px-8 lg:grid-cols-2 lg:pt-40 lg:pb-28">
          <div>
            <Badge variant="outline" className="mb-5 gap-1.5 border-primary/30 text-primary">
              <HugeiconsIcon icon={SparklesIcon} size={13} />
              Point of sale, built for the Kenyan duka
            </Badge>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Run your shop like a{" "}
              <span className="text-primary">well-kept ledger.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Duka POS turns the paper exercise book into a fast, precise till — checkout, stock,
              customers and reports in one calm, uptown workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={isAuthed ? "/dashboard" : "/login"}>
                  {isAuthed ? "Open dashboard" : "Sign in"}
                  <HugeiconsIcon icon={ArrowRight01Icon} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">Explore features</a>
              </Button>
            </div>

            {/* trust figures */}
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {[
                { k: "16%", v: "VAT handled" },
                { k: "3", v: "Payment methods" },
                { k: "0", v: "Cents lost to rounding" },
              ].map((s) => (
                <div key={s.v} className="ledger-rule-top pt-3">
                  <dt className="font-figures text-2xl font-semibold text-foreground">{s.k}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero mock — a stylised sale card */}
          <div className="relative">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* ---------------- About ---------------- */}
      <section id="about" className="scroll-mt-16 border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="font-display text-sm font-semibold tracking-wide text-primary uppercase">
              The idea
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Every number, accountable.
            </h2>
            <div className="mt-5 space-y-4 text-muted-foreground">
              <p>
                Kenyan shops have always run on a ledger — a ruled exercise book where every entry
                lines up in a column and nothing goes unrecorded. Duka POS keeps that discipline and
                renders it in glass and whitespace.
              </p>
              <p>
                Prices are stored to the cent with no floating-point drift, every stock change leaves
                an audit trail, and receipts read like a real ledger column. It&apos;s software a
                private bank would be happy to hand its own tellers.
              </p>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Designed &amp; built by{" "}
              <span className="font-medium text-foreground">Atlas Labs</span>.
            </p>
          </div>

          {/* dark ledger panel */}
          <div className="rounded-2xl bg-sidebar p-8 text-sidebar-foreground">
            <div className="flex items-center gap-2 text-sidebar-muted">
              <HugeiconsIcon icon={Store04Icon} size={18} />
              <span className="text-sm">Bidii General Store</span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { label: "Today's revenue", value: "KES 48,250.00" },
                { label: "Sales completed", value: "37" },
                { label: "Low-stock items", value: "4" },
              ].map((r) => (
                <div key={r.label} className="flex items-end justify-between border-b border-white/10 pb-3">
                  <span className="text-sm text-sidebar-muted">{r.label}</span>
                  <span className="font-figures text-xl font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-sidebar-muted">
              <HugeiconsIcon icon={CloudIcon} size={14} />
              Synced to the cloud, ready on every device.
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-sm font-semibold tracking-wide text-primary uppercase">
              Everything the counter needs
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One workspace, nine sections, zero clutter.
            </h2>
            <p className="mt-4 text-muted-foreground">
              From the first scan to the month-end report, every tool is where you expect it.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-sm"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <HugeiconsIcon icon={f.icon} size={22} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Offer ---------------- */}
      <section id="offer" className="scroll-mt-16 border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-sm font-semibold tracking-wide text-primary uppercase">
              Launch offer
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One shop. One price. Everything included.
            </h2>
          </div>

          <div className="mx-auto mt-14 max-w-lg">
            <div className="ledger-rule-top overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">Duka POS</p>
                    <p className="text-sm text-muted-foreground">Single-shop licence</p>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Save 20%
                  </Badge>
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="font-figures text-5xl font-semibold text-foreground">
                    KES&nbsp;2,000
                  </span>
                  <span className="mb-1.5 text-sm text-muted-foreground">/ month</span>
                </div>

                <ul className="mt-8 space-y-3">
                  {OFFER_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                        <HugeiconsIcon icon={Tick02Icon} size={13} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="mt-8 w-full">
                  <Link href={isAuthed ? "/dashboard" : "/login"}>
                    {isAuthed ? "Open dashboard" : "Get started"}
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                  </Link>
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  No card details needed to try the demo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <HugeiconsIcon icon={Store04Icon} size={18} />
                </span>
                <span className="font-display text-lg font-semibold">Duka POS</span>
              </div>
              <p className="mt-4 text-sm text-sidebar-muted">
                A calm, precise point of sale for the Kenyan general shop. Built by Atlas Labs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <FooterCol
                title="Product"
                links={[
                  { label: "About", href: "#about" },
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#offer" },
                ]}
              />
              <FooterCol
                title="Get started"
                links={[
                  { label: "Sign in", href: "/login" },
                  { label: "Dashboard", href: "/dashboard" },
                ]}
              />
              <FooterCol
                title="Company"
                links={[
                  { label: "Atlas Labs", href: "#top" },
                  { label: "Contact", href: "mailto:hello@atlaslabs.co.ke" },
                ]}
              />
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-sidebar-muted sm:flex-row">
            <p>
              © <span className="font-figures">{new Date().getFullYear()}</span> Atlas Labs. All
              rights reserved.
            </p>
            <p>Made in Kenya 🇰🇪</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <p className="font-display text-sm font-semibold text-sidebar-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-sidebar-muted transition-colors hover:text-sidebar-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HeroMock() {
  const items = [
    { name: "Pembe Maize Flour 2kg", qty: 2, total: "330.00" },
    { name: "Fresh Fri Cooking Oil 1L", qty: 1, total: "320.00" },
    { name: "Brookside Milk 500ml", qty: 3, total: "165.00" },
    { name: "Festive White Bread 400g", qty: 1, total: "65.00" },
  ]
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <HugeiconsIcon icon={ShoppingCart01Icon} size={18} />
            Current sale
          </div>
          <Badge variant="outline" className="font-figures">
            INV-000481
          </Badge>
        </div>

        {/* items */}
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.name} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                <p className="font-figures text-xs text-muted-foreground">×{it.qty}</p>
              </div>
              <span className="font-figures text-sm text-foreground">{it.total}</span>
            </li>
          ))}
        </ul>

        {/* totals */}
        <div className="space-y-1.5 px-5 pt-3 pb-5">
          <Row label="Subtotal" value="880.00" muted />
          <Row label="VAT (16%)" value="140.80" muted />
          <div className="ledger-rule-top mt-1 flex items-center justify-between pt-2.5">
            <span className="font-display font-semibold text-foreground">Total</span>
            <span className="font-figures text-lg font-semibold text-primary">KES 1,020.80</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-xs text-muted-foreground" : "text-xs text-foreground"}>
        {label}
      </span>
      <span className="font-figures text-sm">{value}</span>
    </div>
  )
}
