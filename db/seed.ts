/**
 * Seed script — run with:  pnpm db:seed
 *
 * Order: settings -> categories -> products (+ SVG placeholders) ->
 * inventory_levels -> users (admin + 2 cashiers w/ PINs) -> customers ->
 * backdated sales/sale_items/stock_movements spanning ~7 days.
 */
import { neonConfig, Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import { eq } from "drizzle-orm"
import ws from "ws"
import bcrypt from "bcryptjs"

import * as schema from "./schema"
import { CATEGORY_DATA, PRODUCT_DATA, generateProductImages } from "./catalog"

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws
}

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) before seeding.")
}

const pool = new Pool({ connectionString })
const db = drizzle(pool, { schema })

const CUSTOMER_DATA = [
  { name: "Wanjiku Kamau", phone: "+254712345678", email: "wanjiku@example.com" },
  { name: "Otieno Odhiambo", phone: "+254723456789", email: null },
  { name: "Achieng Auma", phone: "+254734567890", email: "achieng@example.com" },
  { name: "Mwangi Njoroge", phone: "+254745678901", email: null },
]

// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Seeding Duka POS…")

  // Wipe (child -> parent order) so the script is re-runnable.
  await db.delete(schema.saleItems)
  await db.delete(schema.receipts)
  await db.delete(schema.sales)
  await db.delete(schema.stockMovements)
  await db.delete(schema.inventoryLevels)
  await db.delete(schema.products)
  await db.delete(schema.categories)
  await db.delete(schema.customers)
  await db.delete(schema.magicLinkTokens)
  await db.delete(schema.sessions)
  await db.delete(schema.users)
  await db.delete(schema.settings)

  // 1. Settings
  await db.insert(schema.settings).values({
    shopName: "Bidii General Store",
    shopAddress: "Biashara Street, Nakuru",
    shopPhone: "+254720000000",
    shopEmail: "hello@bidiistore.co.ke",
    currency: "KES",
    defaultTaxRate: "16.00",
    receiptFooterNote: "Asante kwa kununua nasi!",
    lowStockThresholdDefault: 5,
  })

  // 2. Categories
  const insertedCats = await db
    .insert(schema.categories)
    .values(CATEGORY_DATA.map((c) => ({ name: c.name, slug: c.slug, description: c.description })))
    .returning()
  const catBySlug = new Map(insertedCats.map((c) => [c.slug, c]))

  // 3. Products + product images (SVGs) + inventory
  generateProductImages()

  const insertedProducts: schema.Product[] = []
  for (const p of PRODUCT_DATA) {
    const cat = catBySlug.get(p.category)
    if (!cat) continue

    const [row] = await db
      .insert(schema.products)
      .values({
        name: p.name,
        sku: p.sku,
        categoryId: cat.id,
        unit: p.unit,
        priceCents: p.priceCents,
        costPriceCents: p.costCents,
        taxRate: "16.00",
        reorderLevel: p.reorder,
        imageUrl: `/seed-products/${p.sku}.svg`,
        isActive: true,
      })
      .returning()
    insertedProducts.push(row)

    await db.insert(schema.inventoryLevels).values({
      productId: row.id,
      quantityOnHand: p.stock,
    })
  }
  console.log(`  • ${insertedProducts.length} products`)

  // 4. Users (admin + 2 cashiers). PINs printed on first run.
  const adminPin = "2468"
  const cashier1Pin = "1234"
  const cashier2Pin = "5678"
  const [admin] = await db
    .insert(schema.users)
    .values({
      name: "Store Owner",
      email: "owner@bidiistore.co.ke",
      role: "admin",
      pinHash: await bcrypt.hash(adminPin, 10),
    })
    .returning()
  const [cashier1] = await db
    .insert(schema.users)
    .values({
      name: "Grace Wambui",
      email: "grace@bidiistore.co.ke",
      role: "cashier",
      pinHash: await bcrypt.hash(cashier1Pin, 10),
    })
    .returning()
  const [cashier2] = await db
    .insert(schema.users)
    .values({
      name: "Peter Kimani",
      email: "peter@bidiistore.co.ke",
      role: "cashier",
      pinHash: await bcrypt.hash(cashier2Pin, 10),
    })
    .returning()
  const cashiers = [cashier1, cashier2]

  // 5. Customers
  const insertedCustomers = await db.insert(schema.customers).values(CUSTOMER_DATA).returning()

  // 6. Backdated sales over the last 7 days.
  let invoiceSeq = 1
  const paymentMethods: schema.PaymentMethod[] = ["cash", "mpesa", "card"]
  let salesCount = 0

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const salesToday = 3 + (dayOffset % 4) // 3–6 sales/day, deterministic
    for (let s = 0; s < salesToday; s++) {
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - dayOffset)
      createdAt.setHours(9 + ((s * 2) % 9), (s * 17) % 60, 0, 0)

      // 1–4 line items, chosen deterministically.
      const lineCount = 1 + ((dayOffset + s) % 4)
      const chosen: schema.Product[] = []
      for (let i = 0; i < lineCount; i++) {
        chosen.push(insertedProducts[(dayOffset * 7 + s * 3 + i) % insertedProducts.length])
      }

      let subtotal = 0
      let tax = 0
      const lines = chosen.map((prod, i) => {
        const qty = 1 + ((s + i) % 3)
        const lineSub = prod.priceCents * qty
        const lineTax = Math.round((lineSub * Number(prod.taxRate)) / 100)
        subtotal += lineSub
        tax += lineTax
        return { prod, qty, lineSub, lineTax }
      })
      const grand = subtotal + tax

      const cashier = cashiers[s % cashiers.length]
      const customer = (dayOffset + s) % 2 === 0 ? insertedCustomers[(s) % insertedCustomers.length] : null

      const [sale] = await db
        .insert(schema.sales)
        .values({
          invoiceNumber: `INV-${String(invoiceSeq++).padStart(6, "0")}`,
          customerId: customer?.id ?? null,
          cashierId: cashier.id,
          subtotalCents: subtotal,
          taxTotalCents: tax,
          discountTotalCents: 0,
          grandTotalCents: grand,
          paymentMethod: paymentMethods[(dayOffset + s) % paymentMethods.length],
          paymentReference: null,
          status: "completed",
          createdAt,
        })
        .returning()

      for (const l of lines) {
        await db.insert(schema.saleItems).values({
          saleId: sale.id,
          productId: l.prod.id,
          unitPriceCents: l.prod.priceCents,
          quantity: l.qty,
          lineSubtotalCents: l.lineSub,
          lineTaxCents: l.lineTax,
        })
        await db.insert(schema.stockMovements).values({
          productId: l.prod.id,
          type: "sale",
          quantityDelta: -l.qty,
          referenceType: "sale",
          referenceId: sale.id,
          createdBy: cashier.id,
          createdAt,
        })
      }

      if (customer) {
        await db
          .update(schema.customers)
          .set({
            totalSpentCents: customer.totalSpentCents + grand,
            loyaltyPoints: customer.loyaltyPoints + Math.floor(grand / 10000),
          })
          .where(eq(schema.customers.id, customer.id))
        customer.totalSpentCents += grand
        customer.loyaltyPoints += Math.floor(grand / 10000)
      }
      salesCount++
    }
  }
  console.log(`  • ${salesCount} backdated sales`)

  console.log("\n✅ Seed complete. Sign-in emails (magic link) + PINs:")
  console.log(`   Admin    ${admin.email}   PIN ${adminPin}`)
  console.log(`   Cashier  ${cashier1.email}   PIN ${cashier1Pin}`)
  console.log(`   Cashier  ${cashier2.email}   PIN ${cashier2Pin}`)
  console.log("\n   Sign in via /login (magic link). Without RESEND_API_KEY the link is logged to the server console.")

  await pool.end()
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
