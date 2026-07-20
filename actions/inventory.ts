"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { adjustStockSchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireRole, getActiveCashier } from "@/lib/auth-session"
import { adjustStockTx, InsufficientStockError } from "@/lib/inventory-core"

/** Manual stock adjustment from the /inventory screen. */
export async function adjustStock(input: unknown): Promise<ActionResult<{ quantityOnHand: number }>> {
  await requireRole("manager")
  const parsed = parseOr(adjustStockSchema, input)
  if (!parsed.success) return parsed.result

  const cashier = await getActiveCashier()

  try {
    const { productId, type, quantity, note } = parsed.data
    // Normalise sign by movement type. `adjustment` is the only signed one.
    const magnitude = Math.abs(quantity)
    const delta =
      type === "restock" || type === "return"
        ? magnitude
        : type === "waste"
          ? -magnitude
          : quantity // adjustment: as entered

    const next = await db.transaction(async (tx) =>
      adjustStockTx(tx, {
        productId,
        quantityDelta: delta,
        type,
        referenceType: "manual",
        note,
        createdBy: cashier.id,
      })
    )

    revalidatePath("/inventory")
    revalidatePath("/products")
    revalidatePath("/dashboard")
    return ok({ quantityOnHand: next })
  } catch (e) {
    if (e instanceof InsufficientStockError) return fail(e.message)
    return fail(errorMessage(e))
  }
}
