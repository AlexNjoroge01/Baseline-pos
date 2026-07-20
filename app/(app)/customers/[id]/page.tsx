import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, SmartPhone01Icon, Mail01Icon } from "@hugeicons/core-free-icons"

import { requireRole } from "@/lib/auth-session"
import { getCustomer, customerSalesHistory } from "@/lib/queries"
import { getSettings } from "@/lib/settings"
import { formatCents, formatKES } from "@/lib/money"
import { formatDateTime } from "@/lib/datetime"
import { KpiCard } from "@/components/app/kpi-card"
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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole("cashier")
  const { id } = await params
  const [customer, settings] = await Promise.all([getCustomer(id), getSettings()])
  if (!customer) notFound()

  const history = await customerSalesHistory(id)
  const cur = settings.currency

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/customers">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          All customers
        </Link>
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">{customer.name}</h2>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={SmartPhone01Icon} size={15} />
              <span className="font-figures">{customer.phone}</span>
            </span>
            {customer.email && (
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Mail01Icon} size={15} />
                {customer.email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total spent" value={<>{cur} {formatCents(customer.totalSpentCents)}</>} />
        <KpiCard label="Loyalty points" value={customer.loyaltyPoints} />
        <KpiCard label="Purchases" value={history.length} />
        <KpiCard
          label="Member since"
          value={<span className="text-lg">{formatDateTime(customer.createdAt).split(",")[0]}</span>}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display">Purchase history</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No purchases yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-figures text-primary">{s.invoiceNumber}</TableCell>
                    <TableCell className="font-figures text-xs text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    <TableCell className="capitalize">{s.paymentMethod}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-figures font-medium">
                      {formatKES(s.grandTotalCents, cur)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
