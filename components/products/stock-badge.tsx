import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Stock status as an outline badge (Design.md §5): coloured text/border, white
 * fill — never a loud solid fill. In-stock = success, low = warning, out = destructive.
 */
export function StockBadge({
  quantity,
  reorderLevel,
}: {
  quantity: number
  reorderLevel: number
}) {
  const status =
    quantity <= 0 ? "out" : quantity <= reorderLevel ? "low" : "in"

  const styles: Record<typeof status, string> = {
    in: "border-[var(--success)]/40 text-[var(--success)]",
    low: "border-[var(--warning)]/40 text-[var(--warning)]",
    out: "border-destructive/40 text-destructive",
  }
  const labels: Record<typeof status, string> = {
    in: "In stock",
    low: "Low stock",
    out: "Out of stock",
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", styles[status])}>
      <span className="font-figures font-medium">{quantity}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">{labels[status]}</span>
    </Badge>
  )
}
