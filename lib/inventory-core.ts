import { eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { inventoryLevels, stockMovements, type MovementType } from "@/db/schema"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export class InsufficientStockError extends Error {}

/**
 * The single choke point for stock changes. Always does two things atomically
 * inside the caller's transaction: bump inventory_levels.quantityOnHand and
 * append a stock_movements audit row. `quantityDelta` is signed.
 *
 * Lives outside the "use server" action file because it takes a live transaction
 * handle (non-serialisable) — only serialisable async functions may be exported
 * from a server-action module.
 */
export async function adjustStockTx(
  tx: Tx,
  args: {
    productId: string
    quantityDelta: number
    type: MovementType
    referenceType: "sale" | "manual"
    referenceId?: string | null
    note?: string | null
    createdBy: string
  }
): Promise<number> {
  const [level] = await tx
    .select()
    .from(inventoryLevels)
    .where(eq(inventoryLevels.productId, args.productId))
    .limit(1)

  const current = level?.quantityOnHand ?? 0
  const next = current + args.quantityDelta
  if (next < 0) {
    throw new InsufficientStockError("Not enough stock on hand.")
  }

  if (level) {
    await tx
      .update(inventoryLevels)
      .set({ quantityOnHand: next, updatedAt: new Date() })
      .where(eq(inventoryLevels.productId, args.productId))
  } else {
    await tx.insert(inventoryLevels).values({ productId: args.productId, quantityOnHand: next })
  }

  await tx.insert(stockMovements).values({
    productId: args.productId,
    type: args.type,
    quantityDelta: args.quantityDelta,
    referenceType: args.referenceType,
    referenceId: args.referenceId ?? null,
    note: args.note ?? null,
    createdBy: args.createdBy,
  })

  return next
}

/** Current on-hand for a product. */
export async function currentStock(productId: string): Promise<number> {
  const [row] = await db
    .select({ q: sql<number>`coalesce(${inventoryLevels.quantityOnHand}, 0)` })
    .from(inventoryLevels)
    .where(eq(inventoryLevels.productId, productId))
    .limit(1)
  return row?.q ?? 0
}
