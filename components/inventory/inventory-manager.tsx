"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, PackageSearchIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { adjustStock } from "@/actions/inventory"
import { movementTypeValues } from "@/lib/validations"
import type { ProductRow } from "@/lib/queries"
import { StockBadge } from "@/components/products/stock-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const MOVEMENT_LABELS: Record<string, string> = {
  restock: "Restock (+)",
  return: "Customer return (+)",
  waste: "Waste / damage (−)",
  adjustment: "Manual adjustment (±)",
}

export function InventoryManager({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = React.useState("")
  const [target, setTarget] = React.useState<ProductRow | null>(null)
  const [type, setType] = React.useState<string>("restock")
  const [quantity, setQuantity] = React.useState("")
  const [note, setNote] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const [isPending, startTransition] = React.useTransition()

  const filtered = products.filter((p) =>
    (p.name + p.sku).toLowerCase().includes(query.toLowerCase())
  )

  function openAdjust(p: ProductRow) {
    setTarget(p)
    setType("restock")
    setQuantity("")
    setNote("")
    setErrors({})
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    setErrors({})
    startTransition(async () => {
      const res = await adjustStock({
        productId: target.id,
        type,
        quantity: Number(quantity),
        note,
      })
      if (res.ok) {
        toast.success(`Stock updated — ${target.name} now at ${res.data.quantityOnHand}`)
        setTarget(null)
      } else {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} size={16} />
          </span>
          <Input
            placeholder="Search products…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-figures text-xs text-muted-foreground">{p.sku}</TableCell>
                <TableCell className="text-right font-figures font-medium">
                  {p.quantityOnHand}
                </TableCell>
                <TableCell className="text-right font-figures text-muted-foreground">
                  {p.reorderLevel}
                </TableCell>
                <TableCell>
                  <StockBadge quantity={p.quantityOnHand} reorderLevel={p.reorderLevel} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openAdjust(p)}>
                    <HugeiconsIcon icon={PackageSearchIcon} />
                    Adjust
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle className="font-display">Adjust stock — {target?.name}</DialogTitle>
              <DialogDescription>
                On hand: <span className="font-figures">{target?.quantityOnHand}</span>. Every
                change is recorded in the movement log.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label>Movement type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {movementTypeValues.map((t) => (
                      <SelectItem key={t} value={t}>
                        {MOVEMENT_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Quantity {type === "adjustment" ? "(use − for removals)" : "(units)"}
                </Label>
                <Input
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  aria-invalid={!!errors.quantity}
                  autoFocus
                />
                {errors.quantity && <p className="text-sm text-destructive">{errors.quantity[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Note (optional)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Apply adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
