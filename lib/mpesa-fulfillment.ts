import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { paymentRequests, paymentRequestItems } from "@/db/schema"
import { createSale, type CreateSaleResult } from "@/actions/sales"

export type PaymentOutcome =
  | { success: true; mpesaReceiptNumber: string; resultDesc: string }
  | { success: false; resultDesc: string }

export type FinalizeResult = {
  status: "completed" | "failed" | "already-handled"
  sale?: CreateSaleResult
}

/**
 * The single place a payment_requests row transitions out of "pending".
 * Both the active status-check (actions/mpesa.ts) and the passive Daraja
 * callback (app/api/mpesa/callback) call this, so a sale is created exactly
 * once no matter which path learns about the outcome first: the UPDATE is
 * guarded with `WHERE status = 'pending'`, so only one caller ever wins the
 * race and only that caller creates the sale.
 */
export async function finalizeMpesaPayment(
  paymentRequestId: string,
  outcome: PaymentOutcome
): Promise<FinalizeResult> {
  const [claimed] = await db
    .update(paymentRequests)
    .set({
      status: outcome.success ? "completed" : "failed",
      resultDesc: outcome.resultDesc,
      mpesaReceiptNumber: outcome.success ? outcome.mpesaReceiptNumber : null,
      updatedAt: new Date(),
    })
    .where(and(eq(paymentRequests.id, paymentRequestId), eq(paymentRequests.status, "pending")))
    .returning()

  if (!claimed) {
    return { status: "already-handled" }
  }

  if (!outcome.success) {
    return { status: "failed" }
  }

  const items = await db
    .select({ productId: paymentRequestItems.productId, quantity: paymentRequestItems.quantity })
    .from(paymentRequestItems)
    .where(eq(paymentRequestItems.paymentRequestId, paymentRequestId))

  const result = await createSale({
    items,
    customerId: claimed.customerId,
    paymentMethod: "mpesa",
    paymentReference: outcome.mpesaReceiptNumber,
    discountCents: claimed.discountCents,
  })

  if (!result.ok) {
    // Payment was confirmed by Safaricom but the sale couldn't be written
    // (e.g. stock changed underneath it). Don't silently lose the payment —
    // leave the row flagged so staff can reconcile it manually.
    await db
      .update(paymentRequests)
      .set({ resultDesc: `Payment confirmed but sale creation failed: ${result.error}` })
      .where(eq(paymentRequests.id, paymentRequestId))
    return { status: "completed" }
  }

  await db
    .update(paymentRequests)
    .set({ saleId: result.data.saleId })
    .where(eq(paymentRequests.id, paymentRequestId))

  return { status: "completed", sale: result.data }
}
