import { requireRole } from "@/lib/auth-session"
import { listProducts, recentStockMovements } from "@/lib/queries"
import { formatDateTime } from "@/lib/datetime"
import { PageHeader } from "@/components/app/page-header"
import { InventoryManager } from "@/components/inventory/inventory-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const TYPE_TONE: Record<string, string> = {
  restock: "text-[var(--success)]",
  return: "text-[var(--success)]",
  sale: "text-muted-foreground",
  waste: "text-destructive",
  adjustment: "text-[var(--warning)]",
}

export default async function InventoryPage() {
  await requireRole("manager")
  const [products, movements] = await Promise.all([listProducts(), recentStockMovements(15)])

  return (
    <div>
      <PageHeader title="Inventory" description="Track stock on hand and record adjustments." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InventoryManager products={products} />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display">Recent movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No movements yet.</p>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <Badge variant="outline" className="mt-0.5 shrink-0 capitalize">
                    {m.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.productName}</p>
                    <p className="font-figures text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)} · {m.userName}
                    </p>
                    {m.note ? <p className="text-xs text-muted-foreground">{m.note}</p> : null}
                  </div>
                  <span className={`font-figures text-sm font-semibold ${TYPE_TONE[m.type] ?? ""}`}>
                    {m.quantityDelta > 0 ? "+" : ""}
                    {m.quantityDelta}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
