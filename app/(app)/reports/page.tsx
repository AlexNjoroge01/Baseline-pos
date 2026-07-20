import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"

import { requireRole } from "@/lib/auth-session"
import {
  dashboardKpis,
  salesTrend,
  categoryBreakdown,
  topProducts,
  paymentMethodBreakdown,
} from "@/lib/queries"
import { getSettings } from "@/lib/settings"
import { formatCents, formatKES } from "@/lib/money"
import { PageHeader } from "@/components/app/page-header"
import { KpiCard } from "@/components/app/kpi-card"
import { SalesTrendChart } from "@/components/charts/sales-trend-chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ReportsPage() {
  await requireRole("manager")
  const [kpis, trend, byCategory, top, byPayment, settings] = await Promise.all([
    dashboardKpis(),
    salesTrend(30),
    categoryBreakdown(),
    topProducts(10),
    paymentMethodBreakdown(),
    getSettings(),
  ])
  const cur = settings.currency
  const paymentTotal = byPayment.reduce((s, p) => s + p.revenueCents, 0)

  return (
    <div>
      <PageHeader title="Reports" description="Sales analytics for the whole shop.">
        <Button variant="outline" asChild>
          <a href="/api/reports/export?type=sales" target="_blank" rel="noreferrer">
            <HugeiconsIcon icon={Download01Icon} />
            Export sales CSV
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/api/reports/export?type=products" target="_blank" rel="noreferrer">
            <HugeiconsIcon icon={Download01Icon} />
            Export products CSV
          </a>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="All-time revenue" value={<>{cur} {formatCents(kpis.allTimeRevenueCents)}</>} />
        <KpiCard label="Total sales" value={kpis.allTimeSales} />
        <KpiCard
          label="Avg. sale value"
          value={
            <>
              {cur}{" "}
              {formatCents(kpis.allTimeSales ? Math.round(kpis.allTimeRevenueCents / kpis.allTimeSales) : 0)}
            </>
          }
        />
        <KpiCard label="Low-stock items" value={kpis.lowStockCount} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display">Revenue — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Top products</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No sales yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  top.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right font-figures">{p.unitsSold}</TableCell>
                      <TableCell className="text-right font-figures">
                        {formatCents(p.revenueCents)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">By category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                byCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{c.category}</span>
                    <span className="font-figures text-sm font-medium">
                      {formatKES(c.revenueCents, cur)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">By payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byPayment.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                byPayment.map((p) => (
                  <div key={p.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {p.method}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {paymentTotal ? Math.round((p.revenueCents / paymentTotal) * 100) : 0}%
                      </span>
                    </div>
                    <span className="font-figures text-sm font-medium">
                      {formatKES(p.revenueCents, cur)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
