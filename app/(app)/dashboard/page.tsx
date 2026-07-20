import Link from "next/link"

import {
  dashboardKpis,
  salesTrend,
  categoryBreakdown,
  recentSales,
  topProducts,
} from "@/lib/queries"
import { getSettings } from "@/lib/settings"
import { formatCents, formatKES } from "@/lib/money"
import { formatDateTime } from "@/lib/datetime"
import { KpiCard } from "@/components/app/kpi-card"
import { PageHeader } from "@/components/app/page-header"
import { SalesTrendChart } from "@/components/charts/sales-trend-chart"
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function DashboardPage() {
  const [kpis, trend, byCategory, recent, top, settings] = await Promise.all([
    dashboardKpis(),
    salesTrend(7),
    categoryBreakdown(),
    recentSales(6),
    topProducts(5),
    getSettings(),
  ])
  const cur = settings.currency

  return (
    <div>
      <PageHeader title="Dashboard" description="Today at a glance, and the last seven days." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Today's revenue"
          value={<>{cur} {formatCents(kpis.todayRevenueCents)}</>}
          hint={`${kpis.todaySales} sale${kpis.todaySales === 1 ? "" : "s"} today`}
        />
        <KpiCard
          label="All-time revenue"
          value={<>{cur} {formatCents(kpis.allTimeRevenueCents)}</>}
          hint={`${kpis.allTimeSales} completed sales`}
        />
        <KpiCard label="Low-stock items" value={kpis.lowStockCount} hint="At or below reorder level" />
        <KpiCard label="Customers" value={kpis.customerCount} hint="Registered in loyalty" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Sales trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Revenue by category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length ? (
              <CategoryBreakdownChart data={byCategory} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No sales yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Recent sales</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No sales recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/pos`} className="font-figures text-primary hover:underline">
                          {s.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{s.customerName ?? "Walk-in"}</TableCell>
                      <TableCell>{s.cashierName}</TableCell>
                      <TableCell className="font-figures text-xs text-muted-foreground">
                        {formatDateTime(s.createdAt)}
                      </TableCell>
                      <TableCell className="text-right font-figures font-medium">
                        {formatCents(s.grandTotalCents)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Top products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="font-figures text-sm text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="font-figures text-xs text-muted-foreground">
                      {p.unitsSold} sold
                    </p>
                  </div>
                  <Badge variant="outline" className="font-figures">
                    {formatKES(p.revenueCents, cur)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
