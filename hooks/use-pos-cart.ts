"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createSale, type CreateSaleResult } from "@/actions/sales"
import { initiateMpesaPayment, checkMpesaPaymentStatus } from "@/actions/mpesa"
import type { ProductRow } from "@/lib/queries"

export type CartLine = { product: ProductRow; qty: number }

export type MpesaRequestState = {
  id: string
  phone: string
  amountCents: number
  status: "pending" | "completed" | "failed"
  resultDesc?: string
}

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 30 // ~2 minutes

/**
 * All POS cart/payment state and mutation logic, extracted from PosTerminal
 * so the manual (mouse/touch) UI and the voice assistant operate on the exact
 * same state instance instead of two copies that could drift. Behavior is
 * unchanged from what previously lived inline in PosTerminal.
 */
export function usePosCart(products: ProductRow[]) {
  const router = useRouter()
  const [cart, setCart] = React.useState<Map<string, CartLine>>(new Map())
  const [customerId, setCustomerId] = React.useState<string>("walk-in")
  const [paymentMethod, setPaymentMethod] = React.useState<string>("cash")
  const [paymentReference, setPaymentReference] = React.useState("")
  const [discount, setDiscount] = React.useState("")
  const [isPending, setIsPending] = React.useState(false)
  const [done, setDone] = React.useState<CreateSaleResult | null>(null)
  const [mpesaPhone, setMpesaPhone] = React.useState("")
  const [mpesaRequest, setMpesaRequest] = React.useState<MpesaRequestState | null>(null)
  const [isSendingMpesa, setIsSendingMpesa] = React.useState(false)

  const productsById = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  /** Adds one unit of a product to the cart (mirrors clicking a product tile). */
  function addToCart(p: ProductRow) {
    if (p.quantityOnHand <= 0) {
      toast.error(`${p.name} is out of stock`)
      return false
    }
    let added = false
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(p.id)
      const qty = existing ? existing.qty + 1 : 1
      if (qty > p.quantityOnHand) {
        toast.error(`Only ${p.quantityOnHand} of ${p.name} in stock`)
        return prev
      }
      next.set(p.id, { product: p, qty })
      added = true
      return next
    })
    return added
  }

  /** Adjusts a product's cart quantity by a signed delta (add or remove units). */
  function adjustQty(productId: string, delta: number): { ok: boolean; message?: string } {
    const product = productsById.get(productId)
    if (!product) return { ok: false, message: "Product not found." }

    let result: { ok: boolean; message?: string } = { ok: true }
    setCart((prev) => {
      const existing = prev.get(productId)
      const nextQty = (existing?.qty ?? 0) + delta
      if (nextQty <= 0) {
        const next = new Map(prev)
        next.delete(productId)
        return next
      }
      if (nextQty > product.quantityOnHand) {
        result = { ok: false, message: `Only ${product.quantityOnHand} of ${product.name} in stock.` }
        return prev
      }
      const next = new Map(prev)
      next.set(productId, { product, qty: nextQty })
      return next
    })
    return result
  }

  /** Sets a product's cart quantity to an absolute value (0 removes it). */
  function setQty(productId: string, qty: number): { ok: boolean; message?: string } {
    const product = productsById.get(productId)
    if (!product) return { ok: false, message: "Product not found." }

    let result: { ok: boolean; message?: string } = { ok: true }
    setCart((prev) => {
      const next = new Map(prev)
      if (qty <= 0) {
        next.delete(productId)
        return next
      }
      if (qty > product.quantityOnHand) {
        result = { ok: false, message: `Only ${product.quantityOnHand} of ${product.name} in stock.` }
        return prev
      }
      next.set(productId, { product, qty })
      return next
    })
    return result
  }

  function clearCart() {
    setCart(new Map())
  }

  const lines = React.useMemo(() => Array.from(cart.values()), [cart])
  const subtotalCents = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0)
  const taxCents = lines.reduce(
    (s, l) => s + Math.round((l.product.priceCents * l.qty * Number(l.product.taxRate)) / 100),
    0
  )
  const discountCents = Math.max(0, Math.round(Number(discount || "0") * 100))
  const grandTotalCents = Math.max(0, subtotalCents + taxCents - discountCents)

  function reset() {
    setCart(new Map())
    setCustomerId("walk-in")
    setPaymentMethod("cash")
    setPaymentReference("")
    setDiscount("")
  }

  /** Finalizes the sale for cash/card. M-Pesa goes through initiate/check
   *  payment-status instead — this refuses to short-circuit that flow. Shared
   *  by the manual "Complete sale" button and the voice assistant's
   *  complete_order tool, both of which need the same success/failure result. */
  async function complete(): Promise<{ ok: boolean; message: string; sale?: CreateSaleResult }> {
    if (lines.length === 0) {
      const message = "Cart is empty."
      toast.error(message)
      return { ok: false, message }
    }
    if (paymentMethod === "mpesa") {
      const message = "M-Pesa sales complete automatically once payment is confirmed."
      toast.error(message)
      return { ok: false, message }
    }

    setIsPending(true)
    try {
      const res = await createSale({
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        customerId: customerId === "walk-in" ? null : customerId,
        paymentMethod,
        paymentReference,
        discountCents,
      })
      if (res.ok) {
        setDone(res.data)
        reset()
        router.refresh()
        return { ok: true, message: `Sale completed: invoice ${res.data.invoiceNumber}.`, sale: res.data }
      }
      toast.error(res.error)
      return { ok: false, message: res.error }
    } finally {
      setIsPending(false)
    }
  }

  /** Called once an M-Pesa payment_request has actually completed, to show
   *  the same success dialog and clear the cart the manual flow uses. */
  function completeFromConfirmedPayment(sale: CreateSaleResult) {
    setDone(sale)
    setMpesaRequest(null)
    reset()
    router.refresh()
  }

  /**
   * Sends an STK Push for the current cart. Shared by the manual "Send
   * payment request" button and the voice assistant's initiate_mpesa_payment
   * tool, so both paths quote and poll the exact same request.
   */
  async function sendMpesaRequest(phone: string): Promise<{ ok: boolean; message: string }> {
    if (lines.length === 0) return { ok: false, message: "Cart is empty." }
    if (mpesaRequest?.status === "pending") {
      return { ok: false, message: "A payment request is already in progress." }
    }

    setIsSendingMpesa(true)
    try {
      const res = await initiateMpesaPayment({
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        customerId: customerId === "walk-in" ? null : customerId,
        discountCents,
        phone,
      })
      if (!res.ok) {
        toast.error(res.error)
        return { ok: false, message: res.error }
      }
      setMpesaPhone(phone)
      setMpesaRequest({ id: res.data.paymentRequestId, phone, amountCents: res.data.amountCents, status: "pending" })
      return { ok: true, message: res.data.customerMessage }
    } finally {
      setIsSendingMpesa(false)
    }
  }

  /** One status check against the active payment request, if any. */
  async function checkMpesaStatus(): Promise<MpesaRequestState | null> {
    if (!mpesaRequest) return null
    const res = await checkMpesaPaymentStatus({ paymentRequestId: mpesaRequest.id })
    if (!res.ok) return mpesaRequest

    const next: MpesaRequestState = {
      ...mpesaRequest,
      status: res.data.status,
      resultDesc: res.data.resultDesc,
    }
    setMpesaRequest(next)

    if (res.data.status === "completed" && res.data.sale) {
      completeFromConfirmedPayment(res.data.sale)
    } else if (res.data.status === "failed") {
      toast.error(res.data.resultDesc || "M-Pesa payment failed.")
    }
    return next
  }

  function clearMpesaRequest() {
    setMpesaRequest(null)
  }

  // Auto-poll while a request is pending, so the cart panel updates on its
  // own without the cashier (or the voice assistant) having to ask repeatedly.
  const pollCountRef = React.useRef(0)
  React.useEffect(() => {
    if (!mpesaRequest || mpesaRequest.status !== "pending") {
      pollCountRef.current = 0
      return
    }
    const interval = setInterval(() => {
      pollCountRef.current += 1
      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(interval)
        return
      }
      void checkMpesaStatus()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpesaRequest?.id, mpesaRequest?.status])

  return {
    cart,
    lines,
    customerId,
    setCustomerId,
    paymentMethod,
    setPaymentMethod,
    paymentReference,
    setPaymentReference,
    discount,
    setDiscount,
    discountCents,
    subtotalCents,
    taxCents,
    grandTotalCents,
    isPending,
    done,
    setDone,
    addToCart,
    adjustQty,
    setQty,
    clearCart,
    complete,
    completeFromConfirmedPayment,
    mpesaPhone,
    setMpesaPhone,
    mpesaRequest,
    isSendingMpesa,
    sendMpesaRequest,
    checkMpesaStatus,
    clearMpesaRequest,
  }
}

export type PosCart = ReturnType<typeof usePosCart>
