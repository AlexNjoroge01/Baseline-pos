"use server"

import { voiceSearchProductsSchema } from "@/lib/validations"
import { ok, fail, parseOr, type ActionResult } from "@/lib/action-result"
import { requireSession } from "@/lib/auth-session"
import { listActiveProductsForPos } from "@/lib/queries"

export type VoiceProductMatch = {
  id: string
  name: string
  priceCents: number
  unit: string
  categoryName: string
  quantityOnHand: number
  inStock: boolean
}

const MAX_MATCHES = 8
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g")

/** Strips control characters so a malicious/garbled product name can't be
 *  used to inject formatting or instructions into the agent's context. */
function sanitize(text: string): string {
  return text.replace(CONTROL_CHARS, "").slice(0, 120)
}

/**
 * Live product search for the voice assistant's `find_products` tool. Reuses
 * the exact same query (`listActiveProductsForPos`) that drives the visible
 * POS grid, so price/stock the agent hears about is never stale or invented -
 * it's the same data the cashier is looking at.
 */
export async function voiceSearchProducts(
  input: unknown
): Promise<ActionResult<VoiceProductMatch[]>> {
  await requireSession()
  const parsed = parseOr(voiceSearchProductsSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const q = parsed.data.query.trim().toLowerCase()
    const products = await listActiveProductsForPos()
    const matches = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
      )
      .slice(0, MAX_MATCHES)
      .map((p) => ({
        id: p.id,
        name: sanitize(p.name),
        priceCents: p.priceCents,
        unit: p.unit,
        categoryName: sanitize(p.categoryName),
        quantityOnHand: p.quantityOnHand,
        inStock: p.quantityOnHand > 0,
      }))

    return ok(matches)
  } catch {
    return fail("Couldn't search products right now.")
  }
}
