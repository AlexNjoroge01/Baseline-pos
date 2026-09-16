"use server"

import { revalidatePath } from "next/cache"
import { eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { sales, saleItems, customers } from "@/db/schema"
import { createSaleSchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { getActiveCashier } from "@/lib/auth-session"
import { adjustStockTx, InsufficientStockError } from "@/lib/inventory-core"
import { priceCartLines } from "@/lib/pricing"
import { renderReceiptPdf } from "@/lib/receipt"
import { sendReceipt } from "@/lib/email"
import { getSettings } from "@/lib/settings"

const LOYALTY_CENTS_PER_POINT = 10000 // 1 pt per 100 KES

function invoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(6, "0")}`
}

export type CreateSaleResult = {
  saleId: string
  invoiceNumber: string
  grandTotalCents: number
}

/**
 * The checkout transaction. Re-checks stock under the transaction, snapshots
 * prices, writes the sale + items, decrements inventory via adjustStockTx, and
 * updates customer loyalty — all atomically. PDF render + email happen after
 * commit so a slow email never rolls back a completed sale.
 */
export async function createSale(input: unknown): Promise<ActionResult<CreateSaleResult>> {
  const parsed = parseOr(createSaleSchema, input)
  if (!parsed.success) return parsed.result

  const cashier = await getActiveCashier()
  const { items, customerId, paymentMethod, paymentReference, discountCents } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      // 1-2. Re-price + re-check stock for the cart lines (single choke point,
      // shared with the M-Pesa STK Push initiator so both paths always agree).
      const { lines, subtotalCents, taxTotalCents } = await priceCartLines(tx, items)

      const cappedDiscount = Math.min(discountCents, subtotalCents + taxTotalCents)
      const grandTotalCents = subtotalCents + taxTotalCents - cappedDiscount

      // 3. Next invoice number.
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(sales)
      const invNo = invoiceNumber((count ?? 0) + 1)

      // 4. Insert the sale.
      const [sale] = await tx
        .insert(sales)
        .values({
          invoiceNumber: invNo,
          customerId: customerId ?? null,
          cashierId: cashier.id,
          subtotalCents,
          taxTotalCents,
          discountTotalCents: cappedDiscount,
          grandTotalCents,
          paymentMethod,
          paymentReference: paymentReference || null,
          status: "completed",
        })
        .returning({ id: sales.id })

      // 5. Insert sale items.
      await tx.insert(saleItems).values(
        lines.map((l) => ({
          saleId: sale.id,
          productId: l.productId,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          lineSubtotalCents: l.lineSubtotalCents,
          lineTaxCents: l.lineTaxCents,
        }))
      )

      // 6. Decrement inventory + audit rows.
      for (const l of lines) {
        await adjustStockTx(tx, {
          productId: l.productId,
          quantityDelta: -l.quantity,
          type: "sale",
          referenceType: "sale",
          referenceId: sale.id,
          createdBy: cashier.id,
        })
      }

      // 7. Customer loyalty + spend.
      if (customerId) {
        const points = Math.floor(grandTotalCents / LOYALTY_CENTS_PER_POINT)
        await tx
          .update(customers)
          .set({
            totalSpentCents: sql`${customers.totalSpentCents} + ${grandTotalCents}`,
            loyaltyPoints: sql`${customers.loyaltyPoints} + ${points}`,
          })
          .where(eq(customers.id, customerId))
      }

      return { saleId: sale.id, invoiceNumber: invNo, grandTotalCents, customerId }
    })

    // 8. Post-commit: render receipt PDF + email if the customer has an email.
    try {
      const { buffer } = await renderReceiptPdf(result.saleId)
      if (result.customerId) {
        const [cust] = await db
          .select({ email: customers.email })
          .from(customers)
          .where(eq(customers.id, result.customerId))
          .limit(1)
        if (cust?.email) {
          const settings = await getSettings()
          await sendReceipt(cust.email, result.invoiceNumber, buffer, settings.shopName)
          // best-effort; failure here shouldn't fail the sale
        }
      }
    } catch (e) {
      console.error("Receipt post-processing failed:", errorMessage(e))
    }

    revalidatePath("/pos")
    revalidatePath("/dashboard")
    revalidatePath("/reports")
    revalidatePath("/inventory")
    return ok({
      saleId: result.saleId,
      invoiceNumber: result.invoiceNumber,
      grandTotalCents: result.grandTotalCents,
    })
  } catch (e) {
    if (e instanceof InsufficientStockError) return fail(e.message)
    return fail(errorMessage(e))
  }
}
