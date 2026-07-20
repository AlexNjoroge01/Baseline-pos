"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Edit02Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { createProduct, updateProduct } from "@/actions/products"
import { fromCents } from "@/lib/money"
import { unitValues } from "@/lib/validations"
import type { ProductRow } from "@/lib/queries"
import { StockBadge } from "@/components/products/stock-badge"
import { ProductImage } from "@/components/products/product-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/app/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Category = { id: string; name: string }

type FormState = {
  name: string
  sku: string
  barcode: string
  categoryId: string
  unit: string
  price: string
  costPrice: string
  taxRate: string
  reorderLevel: string
  imageUrl: string
  isActive: boolean
}

function emptyForm(defaultTaxRate: string, categoryId: string): FormState {
  return {
    name: "",
    sku: "",
    barcode: "",
    categoryId,
    unit: "piece",
    price: "",
    costPrice: "",
    taxRate: defaultTaxRate,
    reorderLevel: "5",
    imageUrl: "",
    isActive: true,
  }
}

export function ProductManager({
  products,
  categories,
  canEdit,
  currency,
  defaultTaxRate,
}: {
  products: ProductRow[]
  categories: Category[]
  canEdit: boolean
  currency: string
  defaultTaxRate: string
}) {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm(defaultTaxRate, categories[0]?.id ?? ""))
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const [isPending, startTransition] = React.useTransition()

  const filtered = products.filter((p) => {
    const q = query.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q)
    )
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openNew() {
    setEditingId(null)
    setForm(emptyForm(defaultTaxRate, categories[0]?.id ?? ""))
    setErrors({})
    setOpen(true)
  }

  function openEdit(p: ProductRow) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      categoryId: p.categoryId,
      unit: p.unit,
      price: String(fromCents(p.priceCents)),
      costPrice: p.costPriceCents ? String(fromCents(p.costPriceCents)) : "",
      taxRate: p.taxRate,
      reorderLevel: String(p.reorderLevel),
      imageUrl: p.imageUrl ?? "",
      isActive: p.isActive,
    })
    setErrors({})
    setOpen(true)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const payload = {
      ...form,
      reorderLevel: Number(form.reorderLevel),
    }
    startTransition(async () => {
      const res = editingId
        ? await updateProduct(editingId, payload)
        : await createProduct(payload)
      if (res.ok) {
        toast.success(editingId ? "Product updated" : "Product created")
        setOpen(false)
      } else {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} size={16} />
          </span>
          <Input
            placeholder="Search name, SKU or barcode…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {canEdit && (
          <Button onClick={openNew}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New product
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? "No products yet" : "No matches"}
          description={
            products.length === 0
              ? "Add your first product to start selling."
              : "Try a different search term."
          }
        >
          {canEdit && products.length === 0 && (
            <Button onClick={openNew}>
              <HugeiconsIcon icon={PlusSignIcon} />
              New product
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price ({currency})</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <ProductImage src={p.imageUrl} name={p.name} className="size-9 text-xs" />
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-figures text-xs text-muted-foreground">
                    {p.sku}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                  <TableCell className="text-right font-figures">
                    {(p.priceCents / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StockBadge quantity={p.quantityOnHand} reorderLevel={p.reorderLevel} />
                  </TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <Badge variant="outline">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Hidden
                      </Badge>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}>
                        <HugeiconsIcon icon={Edit02Icon} />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display">
              {editingId ? "Edit product" : "New product"}
            </SheetTitle>
            <SheetDescription>Prices are entered in {currency}, tax added on top.</SheetDescription>
          </SheetHeader>

          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4">
              <Field label="Name" error={errors.name}>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" error={errors.sku}>
                  <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
                </Field>
                <Field label="Barcode" error={errors.barcode}>
                  <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
                </Field>
              </div>
              <Field label="Category" error={errors.categoryId}>
                <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit" error={errors.unit}>
                  <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitValues.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Reorder level" error={errors.reorderLevel}>
                  <Input
                    type="number"
                    min={0}
                    value={form.reorderLevel}
                    onChange={(e) => set("reorderLevel", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Price" error={errors.price}>
                  <Input
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="120.00"
                  />
                </Field>
                <Field label="Cost" error={errors.costPrice}>
                  <Input
                    inputMode="decimal"
                    value={form.costPrice}
                    onChange={(e) => set("costPrice", e.target.value)}
                    placeholder="90.00"
                  />
                </Field>
                <Field label="Tax %" error={errors.taxRate}>
                  <Input
                    inputMode="decimal"
                    value={form.taxRate}
                    onChange={(e) => set("taxRate", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Image URL (optional)" error={errors.imageUrl}>
                <div className="flex items-center gap-3">
                  <ProductImage
                    src={form.imageUrl}
                    name={form.name || "?"}
                    className="size-12 text-sm"
                  />
                  <Input
                    className="flex-1"
                    placeholder="https://… or /seed-products/SKU.svg"
                    value={form.imageUrl}
                    onChange={(e) => set("imageUrl", e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to show the product&apos;s initials automatically.
                </p>
              </Field>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Hidden products can&apos;t be sold.</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              </div>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save product"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  )
}
