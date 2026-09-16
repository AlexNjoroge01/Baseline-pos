"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  PlusSignIcon,
  MinusSignIcon,
  Delete02Icon,
  ShoppingCart01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Loading03Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons"

import { formatCents } from "@/lib/money"
import { paymentMethodValues } from "@/lib/validations"
import type { ProductRow } from "@/lib/queries"
import { usePosCart, type MpesaRequestState } from "@/hooks/use-pos-cart"
import { ProductImage } from "@/components/products/product-image"
import { PinSwitchDialog } from "@/components/pos/pin-switch-dialog"
import { PosVoiceTools } from "@/components/pos/pos-voice-tools"
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
  const [query, setQuery] = React.useState("")
  const [activeCat, setActiveCat] = React.useState<string>("all")
  const posCart = usePosCart(products)
  const {
    lines,
    customerId,
    setCustomerId,
    paymentMethod,
    setPaymentMethod,
    paymentReference,
    setPaymentReference,
    discount,
    setDiscount,
    subtotalCents,
    taxCents,
    grandTotalCents,
    isPending,
    done,
    setDone,
    addToCart,
    setQty,
    complete,
    mpesaPhone,
    setMpesaPhone,
    mpesaRequest,
    isSendingMpesa,
    sendMpesaRequest,
    checkMpesaStatus,
  } = posCart

  const filtered = products.filter((p) => {
    const matchesCat = activeCat === "all" || p.categoryId === activeCat
    const q = query.toLowerCase()
    const matchesQuery =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q)
    return matchesCat && matchesQuery
  })

  return (
    <div className="grid h-[calc(100svh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <PosVoiceTools posCart={posCart} products={products} currency={currency} />
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

          {paymentMethod === "card" && (
            <Input
              placeholder="Card reference"
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

          {paymentMethod === "mpesa" ? (
            <MpesaPanel
              phone={mpesaPhone}
              setPhone={setMpesaPhone}
              request={mpesaRequest}
              isSending={isSendingMpesa}
              disabled={lines.length === 0}
              onSend={sendMpesaRequest}
              onCheckNow={checkMpesaStatus}
            />
          ) : (
            <Button className="w-full" size="lg" disabled={isPending || lines.length === 0} onClick={() => void complete()}>
              {isPending ? "Processing…" : "Complete sale"}
            </Button>
          )}
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

const PHONE_PATTERN = /^\+254[17]\d{8}$/

function MpesaPanel({
  phone,
  setPhone,
  request,
  isSending,
  disabled,
  onSend,
  onCheckNow,
}: {
  phone: string
  setPhone: (v: string) => void
  request: MpesaRequestState | null
  isSending: boolean
  disabled: boolean
  onSend: (phone: string) => Promise<{ ok: boolean; message: string }>
  onCheckNow: () => Promise<unknown>
}) {
  const phoneValid = PHONE_PATTERN.test(phone.trim())

  if (request?.status === "pending") {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-primary" />
          Waiting for payment on <span className="font-figures">{request.phone}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask the customer to check their phone and enter their M-Pesa PIN. The sale completes
          automatically once confirmed.
        </p>
        <Button variant="outline" size="sm" className="w-full" onClick={() => onCheckNow()}>
          Check now
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {request?.status === "failed" && (
        <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {request.resultDesc || "The last payment request failed. You can try again."}
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          <HugeiconsIcon icon={SmartPhone01Icon} size={16} />
        </span>
        <Input
          placeholder="+2547XXXXXXXX"
          className="h-8 font-figures text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        size="lg"
        disabled={disabled || isSending || !phoneValid}
        onClick={() => void onSend(phone.trim())}
      >
        {isSending ? "Sending…" : "Send M-Pesa payment request"}
      </Button>
    </div>
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
