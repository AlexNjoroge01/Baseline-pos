import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { paymentRequests } from "@/db/schema"
import { parseStkCallback } from "@/lib/mpesa"
import { finalizeMpesaPayment } from "@/lib/mpesa-fulfillment"

/**
 * Safaricom posts here once the customer accepts/declines/times out on the
 * STK Push prompt. This route can't require a session — Daraja can't send
 * our cookies — so it authenticates the request only by the fact that it
 * names a CheckoutRequestID we actually issued, and every state transition
 * goes through finalizeMpesaPayment's `WHERE status = 'pending'` guard, so a
 * replayed or duplicate callback can never create a second sale.
 *
 * Needs a publicly reachable HTTPS URL (MPESA_CALLBACK_BASE_URL) to ever be
 * hit at all; actions/mpesa.ts's active status check is the fallback that
 * works without one.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored: invalid body" })
  }

  const parsed = parseStkCallback(body)
  if (!parsed) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored: not an STK callback" })
  }

  const [request_] = await db
    .select({ id: paymentRequests.id })
    .from(paymentRequests)
    .where(eq(paymentRequests.checkoutRequestId, parsed.checkoutRequestId))
    .limit(1)

  if (!request_) {
    // Unknown CheckoutRequestID — either not ours or already cleaned up.
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored: unknown request" })
  }

  try {
    if (parsed.resultCode === 0 && parsed.mpesaReceiptNumber) {
      await finalizeMpesaPayment(request_.id, {
        success: true,
        mpesaReceiptNumber: parsed.mpesaReceiptNumber,
        resultDesc: parsed.resultDesc,
      })
    } else {
      await finalizeMpesaPayment(request_.id, { success: false, resultDesc: parsed.resultDesc })
    }
  } catch (e) {
    console.error("M-Pesa callback processing failed:", e)
    // Still acknowledge receipt so Safaricom doesn't retry indefinitely; the
    // active status-check path will pick this payment up on its next poll.
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
}
