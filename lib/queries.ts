import { and, desc, eq, gte, sql, asc } from "drizzle-orm"

import { db } from "@/db"
import {
  products,
  categories,
  inventoryLevels,
  sales,
  saleItems,
  customers,
  users,
  stockMovements,
} from "@/db/schema"
import { formatDayKey, formatDayLabel } from "@/lib/datetime"

// ---------------------------------------------------------------------------
// Products & catalogue
// ---------------------------------------------------------------------------
export type ProductRow = {
  id: string
  name: string
  sku: string
  barcode: string | null
  unit: string
  priceCents: number
  costPriceCents: number
  taxRate: string
  reorderLevel: number
  isActive: boolean
  imageUrl: string | null
  categoryId: string
  categoryName: string
  quantityOnHand: number
}

export async function listProducts(): Promise<ProductRow[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      unit: products.unit,
      priceCents: products.priceCents,
      costPriceCents: products.costPriceCents,
      taxRate: products.taxRate,
      reorderLevel: products.reorderLevel,
      isActive: products.isActive,
      imageUrl: products.imageUrl,
      categoryId: products.categoryId,
      categoryName: categories.name,
      quantityOnHand: sql<number>`coalesce(${inventoryLevels.quantityOnHand}, 0)`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(inventoryLevels, eq(inventoryLevels.productId, products.id))
    .orderBy(asc(products.name))
  return rows
}

export async function listActiveProductsForPos(): Promise<ProductRow[]> {
  return (await listProducts()).filter((p) => p.isActive)
}

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name))
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export async function listCustomers() {
  return db.select().from(customers).orderBy(asc(customers.name))
}

export async function getCustomer(id: string) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  return c ?? null
}

export async function customerSalesHistory(id: string) {
  return db
    .select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      grandTotalCents: sales.grandTotalCents,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(eq(sales.customerId, id))
    .orderBy(desc(sales.createdAt))
}

// ---------------------------------------------------------------------------
// Sales / dashboard / reports
// ---------------------------------------------------------------------------
function startOfTodayNairobi(): Date {
  // Nairobi is UTC+3; "today" starts at 00:00 EAT == 21:00 UTC previous day.
  const now = new Date()
  const key = formatDayKey(now) // yyyy-MM-dd in EAT
  return new Date(`${key}T00:00:00+03:00`)
}

export async function dashboardKpis() {
  const todayStart = startOfTodayNairobi()

  const [today] = await db
    .select({
      revenueCents: sql<number>`coalesce(sum(${sales.grandTotalCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(and(gte(sales.createdAt, todayStart), eq(sales.status, "completed")))

  const [allTime] = await db
    .select({
      revenueCents: sql<number>`coalesce(sum(${sales.grandTotalCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(eq(sales.status, "completed"))

  const [lowStock] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .leftJoin(inventoryLevels, eq(inventoryLevels.productId, products.id))
    .where(
      and(
        eq(products.isActive, true),
        sql`coalesce(${inventoryLevels.quantityOnHand}, 0) <= ${products.reorderLevel}`
      )
    )

  const [customerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customers)

  return {
    todayRevenueCents: today?.revenueCents ?? 0,
    todaySales: today?.count ?? 0,
    allTimeRevenueCents: allTime?.revenueCents ?? 0,
    allTimeSales: allTime?.count ?? 0,
    lowStockCount: lowStock?.count ?? 0,
    customerCount: customerCount?.count ?? 0,
  }
}

/** Revenue per day for the last N days (for the dashboard trend chart). */
export async function salesTrend(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({
      grandTotalCents: sales.grandTotalCents,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(and(gte(sales.createdAt, since), eq(sales.status, "completed")))

  // Bucket into local (EAT) day keys.
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    buckets.set(formatDayKey(d), 0)
  }
  for (const r of rows) {
    const key = formatDayKey(r.createdAt)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + r.grandTotalCents)
  }
  return Array.from(buckets.entries()).map(([key, cents]) => ({
    day: formatDayLabel(`${key}T12:00:00+03:00`),
    revenueCents: cents,
  }))
}

export async function categoryBreakdown() {
  const rows = await db
    .select({
      category: categories.name,
      revenueCents: sql<number>`coalesce(sum(${saleItems.lineSubtotalCents} + ${saleItems.lineTaxCents}), 0)::int`,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(sales.status, "completed"))
    .groupBy(categories.name)
    .orderBy(desc(sql`sum(${saleItems.lineSubtotalCents} + ${saleItems.lineTaxCents})`))
  return rows
}

export async function topProducts(limit = 8) {
  return db
    .select({
      name: products.name,
      unitsSold: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
      revenueCents: sql<number>`coalesce(sum(${saleItems.lineSubtotalCents} + ${saleItems.lineTaxCents}), 0)::int`,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(sales.status, "completed"))
    .groupBy(products.id, products.name)
    .orderBy(desc(sql`sum(${saleItems.quantity})`))
    .limit(limit)
}

export async function recentSales(limit = 8) {
  return db
    .select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      grandTotalCents: sales.grandTotalCents,
      paymentMethod: sales.paymentMethod,
      createdAt: sales.createdAt,
      cashierName: users.name,
      customerName: customers.name,
    })
    .from(sales)
    .innerJoin(users, eq(sales.cashierId, users.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.status, "completed"))
    .orderBy(desc(sales.createdAt))
    .limit(limit)
}

export async function paymentMethodBreakdown() {
  return db
    .select({
      method: sales.paymentMethod,
      revenueCents: sql<number>`coalesce(sum(${sales.grandTotalCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(eq(sales.status, "completed"))
    .groupBy(sales.paymentMethod)
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export async function recentStockMovements(limit = 20) {
  return db
    .select({
      id: stockMovements.id,
      productName: products.name,
      type: stockMovements.type,
      quantityDelta: stockMovements.quantityDelta,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      userName: users.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .innerJoin(users, eq(stockMovements.createdBy, users.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export async function listUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      hasPin: sql<boolean>`${users.pinHash} is not null`,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name))
}

export async function listCashiers() {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.isActive, true), sql`${users.pinHash} is not null`))
    .orderBy(asc(users.name))
}
