"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { products, inventoryLevels } from "@/db/schema"
import { productSchema, voiceUpdateProductPriceSchema } from "@/lib/validations"
import { toCents, fromCents } from "@/lib/money"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireRole } from "@/lib/auth-session"

export async function createProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("manager")
  const parsed = parseOr(productSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const p = parsed.data
    const [row] = await db
      .insert(products)
      .values({
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || null,
        categoryId: p.categoryId,
        unit: p.unit,
        priceCents: toCents(p.price),
        costPriceCents: p.costPrice ? toCents(p.costPrice) : 0,
        taxRate: p.taxRate,
        reorderLevel: p.reorderLevel,
        imageUrl: p.imageUrl || null,
        isActive: p.isActive,
      })
      .returning({ id: products.id })

    // Every product gets an inventory row starting at zero on hand.
    await db.insert(inventoryLevels).values({ productId: row.id, quantityOnHand: 0 })

    revalidatePath("/products")
    revalidatePath("/inventory")
    return ok({ id: row.id })
  } catch (e) {
    return fail(friendlyDbError(e))
  }
}

export async function updateProduct(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("manager")
  const parsed = parseOr(productSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const p = parsed.data
    await db
      .update(products)
      .set({
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || null,
        categoryId: p.categoryId,
        unit: p.unit,
        priceCents: toCents(p.price),
        costPriceCents: p.costPrice ? toCents(p.costPrice) : 0,
        taxRate: p.taxRate,
        reorderLevel: p.reorderLevel,
        imageUrl: p.imageUrl || null,
        isActive: p.isActive,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))

    revalidatePath("/products")
    revalidatePath("/inventory")
    return ok(undefined)
  } catch (e) {
    return fail(friendlyDbError(e))
  }
}

/**
 * Voice-friendly price change: fetches the current row and re-runs it through
 * the exact same `updateProduct` validation/authorization path, changing only
 * the price. Avoids asking the voice assistant to restate every other field
 * (SKU, category, tax rate, ...) just to change one number.
 */
export async function updateProductPrice(id: string, price: unknown): Promise<ActionResult> {
  await requireRole("manager")
  const parsed = parseOr(voiceUpdateProductPriceSchema, { productId: id, price })
  if (!parsed.success) return parsed.result

  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!current) return fail("Product not found.")

  return updateProduct(id, {
    name: current.name,
    sku: current.sku,
    barcode: current.barcode ?? "",
    categoryId: current.categoryId,
    unit: current.unit,
    price: parsed.data.price,
    costPrice: current.costPriceCents ? String(fromCents(current.costPriceCents)) : "",
    taxRate: current.taxRate,
    reorderLevel: current.reorderLevel,
    imageUrl: current.imageUrl ?? "",
    isActive: current.isActive,
  })
}

/** Soft-delete: products are never hard-deleted so historical sales stay intact. */
export async function toggleProductActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireRole("manager")
  try {
    await db.update(products).set({ isActive, updatedAt: new Date() }).where(eq(products.id, id))
    revalidatePath("/products")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

function friendlyDbError(e: unknown): string {
  const msg = errorMessage(e)
  if (msg.includes("products_sku_unique") || (msg.includes("sku") && msg.includes("unique"))) {
    return "That SKU is already in use."
  }
  if (msg.includes("barcode") && msg.includes("unique")) {
    return "That barcode is already in use."
  }
  return msg
}
