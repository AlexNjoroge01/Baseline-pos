import { eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { products, inventoryLevels } from "@/db/schema"
import { InsufficientStockError } from "@/lib/inventory-core"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Queryable = typeof db | Tx

export type PricedLine = {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  lineSubtotalCents: number
  lineTaxCents: number
}

export type PricedCart = {
  lines: PricedLine[]
  subtotalCents: number
  taxTotalCents: number
}

/**
 * The single choke point for turning {productId, quantity} lines into
 * authoritative priced lines. Re-fetches product price/tax/stock fresh from
 * the DB every time — the caller-supplied quantity is the only thing trusted
 * from outside; price, tax rate, and stock always come from here. Used by
 * `createSale` (inside its transaction) and by the M-Pesa STK Push initiator
 * (against a plain `db` read, before any sale exists) so both paths price a
 * cart identically and neither can be handed an invented amount.
 */
export async function priceCartLines(
  queryable: Queryable,
  items: { productId: string; quantity: number }[]
): Promise<PricedCart> {
  const ids = items.map((i) => i.productId)
  const rows = await queryable
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      taxRate: products.taxRate,
      isActive: products.isActive,
      onHand: inventoryLevels.quantityOnHand,
    })
    .from(products)
    .leftJoin(inventoryLevels, eq(inventoryLevels.productId, products.id))
    .where(inArray(products.id, ids))

  const byId = new Map(rows.map((r) => [r.id, r]))

  let subtotalCents = 0
  let taxTotalCents = 0
  const lines = items.map((line) => {
    const p = byId.get(line.productId)
    if (!p || !p.isActive) throw new Error("Product unavailable in cart.")
    if ((p.onHand ?? 0) < line.quantity) {
      throw new InsufficientStockError(`Insufficient stock for ${p.name}.`)
    }
    const lineSubtotal = p.priceCents * line.quantity
    const lineTax = Math.round((lineSubtotal * Number(p.taxRate)) / 100)
    subtotalCents += lineSubtotal
    taxTotalCents += lineTax
    return {
      productId: p.id,
      productName: p.name,
      unitPriceCents: p.priceCents,
      quantity: line.quantity,
      lineSubtotalCents: lineSubtotal,
      lineTaxCents: lineTax,
    }
  })

  return { lines, subtotalCents, taxTotalCents }
}
