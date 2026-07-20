import { NextResponse, type NextRequest } from "next/server"
import { desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { sales, users, customers } from "@/db/schema"
import { requireRole } from "@/lib/auth-session"
import { listProducts } from "@/lib/queries"
import { formatCents } from "@/lib/money"
import { formatDateTime } from "@/lib/datetime"

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvEscape).join(",")]
  for (const row of rows) lines.push(row.map(csvEscape).join(","))
  return lines.join("\n")
}

export async function GET(request: NextRequest) {
  await requireRole("manager")
  const type = request.nextUrl.searchParams.get("type") ?? "sales"

  let csv: string
  let filename: string

  if (type === "products") {
    const products = await listProducts()
    csv = toCsv(
      ["Name", "SKU", "Barcode", "Category", "Unit", "Price", "Cost", "Tax %", "On hand", "Reorder", "Active"],
      products.map((p) => [
        p.name,
        p.sku,
        p.barcode,
        p.categoryName,
        p.unit,
        formatCents(p.priceCents),
        formatCents(p.costPriceCents),
        p.taxRate,
        p.quantityOnHand,
        p.reorderLevel,
        p.isActive ? "yes" : "no",
      ])
    )
    filename = "products.csv"
  } else {
    const rows = await db
      .select({
        invoiceNumber: sales.invoiceNumber,
        createdAt: sales.createdAt,
        cashier: users.name,
        customer: customers.name,
        subtotalCents: sales.subtotalCents,
        taxTotalCents: sales.taxTotalCents,
        discountTotalCents: sales.discountTotalCents,
        grandTotalCents: sales.grandTotalCents,
        paymentMethod: sales.paymentMethod,
        status: sales.status,
      })
      .from(sales)
      .innerJoin(users, eq(sales.cashierId, users.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.createdAt))

    csv = toCsv(
      ["Invoice", "Date", "Cashier", "Customer", "Subtotal", "Tax", "Discount", "Total", "Payment", "Status"],
      rows.map((r) => [
        r.invoiceNumber,
        formatDateTime(r.createdAt),
        r.cashier,
        r.customer ?? "Walk-in",
        formatCents(r.subtotalCents),
        formatCents(r.taxTotalCents),
        formatCents(r.discountTotalCents),
        formatCents(r.grandTotalCents),
        r.paymentMethod,
        r.status,
      ])
    )
    filename = "sales.csv"
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
