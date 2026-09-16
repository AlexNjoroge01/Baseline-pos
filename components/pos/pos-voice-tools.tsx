"use client"

import * as React from "react"
import { useConversationClientTool } from "@elevenlabs/react"

import type { PosCart } from "@/hooks/use-pos-cart"
import type { ProductRow } from "@/lib/queries"
import {
  voiceAdjustCartItemSchema,
  voiceSetCartQuantitySchema,
  voiceSetPaymentMethodSchema,
  voiceInitiateMpesaPaymentSchema,
} from "@/lib/validations"

/**
 * Registers the cart/checkout-specific voice tools for as long as the POS
 * screen is mounted (useConversationClientTool ties a tool's lifetime to the
 * component's — it unregisters automatically on unmount), on top of the
 * always-on global tools registered by <VoiceAssistant> in the app header.
 * Renders nothing; this is a pure tool-registration component so the manual
 * cart UI and voice act on the exact same `usePosCart` state instance.
 */
export function PosVoiceTools({
  posCart,
  products,
  currency,
}: {
  posCart: PosCart
  products: ProductRow[]
  currency: string
}) {
  const productsById = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  useConversationClientTool("get_cart", async () => {
    return JSON.stringify({
      currency,
      lines: posCart.lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        quantity: l.qty,
        unitPriceCents: l.product.priceCents,
        lineTotalCents: l.product.priceCents * l.qty,
      })),
      subtotalCents: posCart.subtotalCents,
      taxCents: posCart.taxCents,
      discountCents: posCart.discountCents,
      grandTotalCents: posCart.grandTotalCents,
      paymentMethod: posCart.paymentMethod,
    })
  })

  useConversationClientTool(
    "adjust_cart_item",
    async (parameters: Record<string, unknown>) => {
      const parsed = voiceAdjustCartItemSchema.safeParse(parameters)
      if (!parsed.success) return "That product id or quantity change wasn't valid."
      const product = productsById.get(parsed.data.productId)
      const result = posCart.adjustQty(parsed.data.productId, parsed.data.delta)
      if (!result.ok) return result.message ?? "Couldn't update the cart."
      return `Done. ${product?.name ?? "The item"} is updated in the cart.`
    }
  )

  useConversationClientTool(
    "set_cart_quantity",
    async (parameters: Record<string, unknown>) => {
      const parsed = voiceSetCartQuantitySchema.safeParse(parameters)
      if (!parsed.success) return "That product id or quantity wasn't valid."
      const product = productsById.get(parsed.data.productId)
      const result = posCart.setQty(parsed.data.productId, parsed.data.quantity)
      if (!result.ok) return result.message ?? "Couldn't update the cart."
      return parsed.data.quantity === 0
        ? `Removed ${product?.name ?? "the item"} from the cart.`
        : `${product?.name ?? "The item"} quantity is now ${parsed.data.quantity}.`
    }
  )

  useConversationClientTool("clear_cart", async () => {
    posCart.clearCart()
    return "Cart cleared."
  })

  useConversationClientTool("set_payment_method", async (parameters: Record<string, unknown>) => {
    const parsed = voiceSetPaymentMethodSchema.safeParse(parameters)
    if (!parsed.success) return "Payment method must be cash, mpesa, or card."
    posCart.setPaymentMethod(parsed.data.method)
    return `Payment method set to ${parsed.data.method}.`
  })

  useConversationClientTool("initiate_mpesa_payment", async (parameters: Record<string, unknown>) => {
    const parsed = voiceInitiateMpesaPaymentSchema.safeParse(parameters)
    if (!parsed.success) return "Give the phone number as +2547XXXXXXXX."
    posCart.setPaymentMethod("mpesa")
    const res = await posCart.sendMpesaRequest(parsed.data.phone)
    if (!res.ok) return `Couldn't send the payment request: ${res.message}`
    return (
      `STK push sent to ${parsed.data.phone}. This only means the request was sent — ` +
      "the customer still has to enter their M-Pesa PIN on their phone. Call check_payment_status " +
      "before telling anyone the payment succeeded."
    )
  })

  useConversationClientTool("check_payment_status", async () => {
    const status = await posCart.checkMpesaStatus()
    if (!status) return "No M-Pesa payment is currently pending."
    if (status.status === "pending") {
      return "Still pending — the customer hasn't completed it on their phone yet. Check again shortly."
    }
    if (status.status === "failed") {
      return `Payment failed: ${status.resultDesc || "it was declined or timed out"}. Ask if they'd like to try again.`
    }
    return "Payment confirmed by M-Pesa and the sale is complete."
  })

  useConversationClientTool("complete_order", async () => {
    const res = await posCart.complete()
    return res.message
  })

  return null
}
