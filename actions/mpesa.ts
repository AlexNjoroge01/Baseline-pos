"use server"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { paymentRequests, paymentRequestItems, sales, type PaymentRequest } from "@/db/schema"
import { initiateMpesaPaymentSchema, checkMpesaPaymentStatusSchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireSession, getActiveCashier } from "@/lib/auth-session"
import { InsufficientStockError } from "@/lib/inventory-core"
import { priceCartLines } from "@/lib/pricing"
import { initiateStkPush, queryStkPush, MpesaConfigError, MpesaApiError } from "@/lib/mpesa"
import { finalizeMpesaPayment } from "@/lib/mpesa-fulfillment"
import { getSettings } from "@/lib/settings"
import type { CreateSaleResult } from "@/actions/sales"

export type InitiateMpesaPaymentResult = {
  paymentRequestId: string
  amountCents: number
  customerMessage: string
}

/**
 * Sends an STK Push prompt to the customer's phone for the *current* cart.
 * The amount is always recomputed here from live product prices/stock via
 * priceCartLines — a spoken or client-supplied figure is never trusted or
 * even accepted as input. This only means the push was sent; nothing here
 * ever reports the payment as successful.
 */
export async function initiateMpesaPayment(
  input: unknown
): Promise<ActionResult<InitiateMpesaPaymentResult>> {
  const parsed = parseOr(initiateMpesaPaymentSchema, input)
  if (!parsed.success) return parsed.result

  const cashier = await getActiveCashier()
  const { items, customerId, discountCents, phone } = parsed.data

  let priced: Awaited<ReturnType<typeof priceCartLines>>
  try {
    priced = await priceCartLines(db, items)
  } catch (e) {
    if (e instanceof InsufficientStockError) return fail(e.message)
    return fail(errorMessage(e))
  }

  const cappedDiscount = Math.min(discountCents, priced.subtotalCents + priced.taxTotalCents)
  const amountCents = priced.subtotalCents + priced.taxTotalCents - cappedDiscount
  if (amountCents <= 0) return fail("Cart total must be greater than zero to charge M-Pesa.")

  const [request] = await db
    .insert(paymentRequests)
    .values({
      phone,
      amountCents,
      customerId: customerId ?? null,
      discountCents: cappedDiscount,
      status: "pending",
      initiatedBy: cashier.id,
    })
    .returning({ id: paymentRequests.id })

  await db.insert(paymentRequestItems).values(
    priced.lines.map((l) => ({
      paymentRequestId: request.id,
      productId: l.productId,
      quantity: l.quantity,
    }))
  )

  try {
    const settings = await getSettings()
    const stk = await initiateStkPush({
      phone,
      amountCents,
      accountReference: settings.shopName.slice(0, 12) || "Duka POS",
      transactionDesc: "POS sale",
    })
    await db
      .update(paymentRequests)
      .set({ checkoutRequestId: stk.checkoutRequestId, merchantRequestId: stk.merchantRequestId })
      .where(eq(paymentRequests.id, request.id))

    return ok({ paymentRequestId: request.id, amountCents, customerMessage: stk.customerMessage })
  } catch (e) {
    await db
      .update(paymentRequests)
      .set({ status: "failed", resultDesc: errorMessage(e) })
      .where(eq(paymentRequests.id, request.id))
    if (e instanceof MpesaConfigError) {
      return fail("M-Pesa isn't configured on this till yet. Ask a manager to add Daraja credentials.")
    }
    if (e instanceof MpesaApiError) return fail(e.message)
    return fail(errorMessage(e))
  }
}

export type MpesaPaymentStatusResult = {
  status: "pending" | "completed" | "failed"
  amountCents: number
  resultDesc?: string
  sale?: CreateSaleResult
}

async function loadStatusResult(request: PaymentRequest): Promise<MpesaPaymentStatusResult> {
  if (!request.saleId) {
    return {
      status: request.status,
      amountCents: request.amountCents,
      resultDesc: request.resultDesc ?? undefined,
    }
  }
  const [sale] = await db
    .select({ invoiceNumber: sales.invoiceNumber, grandTotalCents: sales.grandTotalCents })
    .from(sales)
    .where(eq(sales.id, request.saleId))
    .limit(1)
  return {
    status: request.status,
    amountCents: request.amountCents,
    resultDesc: request.resultDesc ?? undefined,
    sale: sale
      ? { saleId: request.saleId, invoiceNumber: sale.invoiceNumber, grandTotalCents: sale.grandTotalCents }
      : undefined,
  }
}

/**
 * The single source of truth for "did the M-Pesa payment go through". Actively
 * re-queries Daraja if still pending (the passive callback needs a public
 * HTTPS URL that may not be reachable in this environment yet), then applies
 * the same idempotent finalize path the callback route uses. Only a
 * "completed" result here may ever be reported to the user/agent as paid.
 */
export async function checkMpesaPaymentStatus(
  input: unknown
): Promise<ActionResult<MpesaPaymentStatusResult>> {
  await requireSession()
  const parsed = parseOr(checkMpesaPaymentStatusSchema, input)
  if (!parsed.success) return parsed.result

  const [request] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.id, parsed.data.paymentRequestId))
    .limit(1)
  if (!request) return fail("Payment request not found.")

  if (request.status !== "pending") {
    return ok(await loadStatusResult(request))
  }

  if (!request.checkoutRequestId) {
    // STK push never actually reached Daraja (e.g. config failed after the
    // row was created) — nothing to query yet.
    return ok({ status: "pending", amountCents: request.amountCents })
  }

  const query = await queryStkPush(request.checkoutRequestId)
  if (!query.isCompleted && !query.isFailed) {
    return ok({ status: "pending", amountCents: request.amountCents })
  }

  const outcome = query.isCompleted
    ? // The query endpoint confirms success but doesn't return the receipt
      // number reliably — fall back to a placeholder if Daraja omits it;
      // the callback route (when reachable) will have already filled it in.
      ({
        success: true,
        mpesaReceiptNumber: request.mpesaReceiptNumber ?? "PENDING-RECEIPT",
        resultDesc: query.resultDesc,
      } as const)
    : ({ success: false, resultDesc: query.resultDesc } as const)

  const result = await finalizeMpesaPayment(request.id, outcome)

  if (result.status === "completed" && result.sale) {
    return ok({ status: "completed", amountCents: request.amountCents, sale: result.sale })
  }

  const [refreshed] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.id, request.id))
    .limit(1)
  return ok(await loadStatusResult(refreshed ?? request))
}
