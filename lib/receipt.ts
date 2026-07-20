import { renderToBuffer } from "@react-pdf/renderer"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { sales, saleItems, products, customers, users, receipts } from "@/db/schema"
import { getSettings } from "@/lib/settings"
import { ReceiptDocument, type ReceiptData, type ReceiptItem } from "@/lib/receipt-pdf"

export class ReceiptNotFoundError extends Error {}

/** Loads everything a receipt needs for the given sale. */
export async function loadReceiptData(saleId: string): Promise<ReceiptData> {
  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1)
  if (!sale) throw new ReceiptNotFoundError(`Sale ${saleId} not found`)

  const items: ReceiptItem[] = (
    await db
      .select({
        quantity: saleItems.quantity,
        unitPriceCents: saleItems.unitPriceCents,
        lineSubtotalCents: saleItems.lineSubtotalCents,
        lineTaxCents: saleItems.lineTaxCents,
        productName: products.name,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, saleId))
  ).map((r) => ({ ...r }))

  const [cashier] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, sale.cashierId))
    .limit(1)

  const customer = sale.customerId
    ? ((await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1))[0] ??
      null)
    : null

  const settings = await getSettings()

  return {
    sale,
    items,
    customer,
    cashier: cashier ?? { name: "—" },
    settings,
  }
}

/**
 * Renders the receipt PDF to a Buffer and upserts the `receipts` row. Used by
 * both the download route and the email attachment path.
 */
export async function renderReceiptPdf(saleId: string): Promise<{ buffer: Buffer; invoiceNumber: string }> {
  const data = await loadReceiptData(saleId)
  const buffer = await renderToBuffer(ReceiptDocument(data))

  const existing = await db.select().from(receipts).where(eq(receipts.saleId, saleId)).limit(1)
  if (existing[0]) {
    await db
      .update(receipts)
      .set({ pdfGeneratedAt: new Date() })
      .where(eq(receipts.saleId, saleId))
  } else {
    await db.insert(receipts).values({ saleId, pdfGeneratedAt: new Date() })
  }

  return { buffer, invoiceNumber: data.sale.invoiceNumber }
}
