"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  PlusSignIcon,
  MinusSignIcon,
  Delete02Icon,
  ShoppingCart01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { createSale, type CreateSaleResult } from "@/actions/sales"
import { formatCents } from "@/lib/money"
import { paymentMethodValues } from "@/lib/validations"
import type { ProductRow } from "@/lib/queries"
import { ProductImage } from "@/components/products/product-image"
import { PinSwitchDialog } from "@/components/pos/pin-switch-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Customer = { id: string; name: string }
type Cashier = { id: string; name: string }
type CartLine = { product: ProductRow; qty: number }

const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", mpesa: "M-Pesa", card: "Card" }

export function PosTerminal({
  products,
  categories,
  customers,
  cashiers,
  activeCashierName,
  currency,
}: {
  products: ProductRow[]
  categories: { id: string; name: string }[]
  customers: Customer[]
  cashiers: Cashier[]
  activeCashierName: string
  currency: string
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [activeCat, setActiveCat] = React.useState<string>("all")
  const [cart, setCart] = React.useState<Map<string, CartLine>>(new Map())
  const [customerId, setCustomerId] = React.useState<string>("walk-in")
  const [paymentMethod, setPaymentMethod] = React.useState<string>("cash")
  const [paymentReference, setPaymentReference] = React.useState("")
  const [discount, setDiscount] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [done, setDone] = React.useState<CreateSaleResult | null>(null)

  const filtered = products.filter((p) => {
    const matchesCat = activeCat === "all" || p.categoryId === activeCat
    const q = query.toLowerCase()
    const matchesQuery =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q)
    return matchesCat && matchesQuery
  })

  function addToCart(p: ProductRow) {
    if (p.quantityOnHand <= 0) {
      toast.error(`${p.name} is out of stock`)
      return
    }
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(p.id)
      const qty = existing ? existing.qty + 1 : 1
      if (qty > p.quantityOnHand) {
        toast.error(`Only ${p.quantityOnHand} of ${p.name} in stock`)
        return prev
      }
      next.set(p.id, { product: p, qty })
      return next
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev)
      const line = next.get(productId)
      if (!line) return prev
      if (qty <= 0) {
        next.delete(productId)
      } else if (qty <= line.product.quantityOnHand) {
        next.set(productId, { ...line, qty })
      } else {
        toast.error(`Only ${line.product.quantityOnHand} in stock`)
      }
      return next
    })
  }

  const lines = Array.from(cart.values())
  const subtotalCents = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0)
  const taxCents = lines.reduce(
    (s, l) => s + Math.round((l.product.priceCents * l.qty * Number(l.product.taxRate)) / 100),
    0
  )
  const discountCents = Math.max(0, Math.round(Number(discount || "0") * 100))
  const grandTotalCents = Math.max(0, subtotalCents + taxCents - discountCents)

  function reset() {
    setCart(new Map())
    setCustomerId("walk-in")
    setPaymentMethod("cash")
    setPaymentReference("")
    setDiscount("")
  }

  function complete() {
    if (lines.length === 0) {
      toast.error("Cart is empty")
      return
    }
    startTransition(async () => {
      const res = await createSale({
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        customerId: customerId === "walk-in" ? null : customerId,
        paymentMethod,
        paymentReference,
        discountCents,
      })
      if (res.ok) {
        setDone(res.data)
        reset()
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="grid h-[calc(100svh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      {/* ---- Product grid ---- */}
      <div className="flex min-h-0 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              <HugeiconsIcon icon={Search01Icon} size={16} />
            </span>
            <Input
              placeholder="Search or scan barcode…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <PinSwitchDialog cashiers={cashiers} />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
            All
          </CatChip>
          {categories.map((c) => (
            <CatChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
              {c.name}
            </CatChip>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const out = p.quantityOnHand <= 0
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={out}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    out && "cursor-not-allowed opacity-50"
                  )}
                >
                  <ProductImage
                    src={p.imageUrl}
                    name={p.name}
                    rounded="rounded-none"
                    className="aspect-square w-full text-2xl"
                  />
                  <div className="flex flex-1 flex-col p-2.5">
                    <span className="line-clamp-2 text-sm font-medium text-foreground">{p.name}</span>
                    <span className="mt-auto pt-1.5 font-figures text-base font-semibold text-foreground">
                      {formatCents(p.priceCents)}
                    </span>
                    <span className="font-figures text-xs text-muted-foreground">
                      {out ? "Out of stock" : `${p.quantityOnHand} in stock`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">No products found.</p>
          )}
        </div>
      </div>

      {/* ---- Cart + payment ---- */}
      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <HugeiconsIcon icon={ShoppingCart01Icon} size={18} />
            Cart
            {lines.length > 0 && <Badge variant="outline">{lines.length}</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">
            Till: <span className="font-medium text-foreground">{activeCashierName}</span>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {lines.length === 0 ? (
            <p className="px-2 py-12 text-center text-sm text-muted-foreground">
              Tap a product to start a sale.
            </p>
          ) : (
            <ul className="space-y-1">
              {lines.map((l) => (
                <li key={l.product.id} className="rounded-md px-2 py-2 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ProductImage
                        src={l.product.imageUrl}
                        name={l.product.name}
                        className="size-8 text-[10px]"
                      />
                      <span className="text-sm font-medium text-foreground">{l.product.name}</span>
                    </div>
                    <button
                      onClick={() => setQty(l.product.id, 0)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => setQty(l.product.id, l.qty - 1)}
                      >
                        <HugeiconsIcon icon={MinusSignIcon} />
                      </Button>
                      <span className="w-8 text-center font-figures text-sm">{l.qty}</span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => setQty(l.product.id, l.qty + 1)}
                      >
                        <HugeiconsIcon icon={PlusSignIcon} />
                      </Button>
                    </div>
                    <span className="font-figures text-sm font-medium text-foreground">
                      {formatCents(l.product.priceCents * l.qty)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payment + totals */}
        <div className="space-y-3 border-t border-border px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodValues.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentMethod !== "cash" && (
            <Input
              placeholder={paymentMethod === "mpesa" ? "M-Pesa code" : "Card reference"}
              className="h-8 font-figures text-sm"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          )}

          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={`${currency} ${formatCents(subtotalCents)}`} muted />
            <Row label="Tax" value={`${currency} ${formatCents(taxCents)}`} muted />
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Discount</Label>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className="h-7 w-24 text-right font-figures text-sm"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            {/* The Ledger Rule above the number that matters. */}
            <div className="ledger-rule-top mt-1 flex items-center justify-between pt-2">
              <span className="font-display font-semibold text-foreground">Total</span>
              <span className="font-figures text-lg font-semibold text-primary">
                {currency} {formatCents(grandTotalCents)}
              </span>
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={isPending || lines.length === 0} onClick={complete}>
            {isPending ? "Processing…" : "Complete sale"}
          </Button>
        </div>
      </div>

      {/* ---- Success dialog ---- */}
      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-accent text-[var(--success)]">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
            </div>
            <DialogTitle className="font-display">Sale completed</DialogTitle>
            <DialogDescription>
              Invoice <span className="font-figures text-foreground">{done?.invoiceNumber}</span> ·{" "}
              <span className="font-figures text-foreground">
                {currency} {done ? formatCents(done.grandTotalCents) : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href={done ? `/api/receipts/${done.saleId}/pdf` : "#"} target="_blank" rel="noreferrer">
                <HugeiconsIcon icon={Download01Icon} />
                Receipt PDF
              </a>
            </Button>
            <Button onClick={() => setDone(null)}>New sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      <span className="font-figures text-sm">{value}</span>
    </div>
  )
}
