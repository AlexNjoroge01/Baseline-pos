import { cn } from "@/lib/utils"

/**
 * Dashboard KPI card. Its accent is the Ledger Rule along the top edge
 * (Design.md §4) — deliberately not a coloured icon-in-a-circle.
 */
export function KpiCard({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "ledger-rule-top rounded-lg border border-border bg-card px-5 py-4",
        className
      )}
    >
      <p className="font-display text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 font-figures text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
