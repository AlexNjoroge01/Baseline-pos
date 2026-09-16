"use server"

import { db } from "@/db"
import { customers, type Customer } from "@/db/schema"
import {
  voiceSalesReportSchema,
  voiceRecentSalesSchema,
  voiceFindCustomersSchema,
  voiceGetCustomerSchema,
  voiceInventoryStatusSchema,
} from "@/lib/validations"
import { ok, fail, parseOr, type ActionResult } from "@/lib/action-result"
import { requireSession, requireRole } from "@/lib/auth-session"
import {
  dashboardKpis,
  salesTrend,
  topProducts,
  categoryBreakdown,
  paymentMethodBreakdown,
  recentSales,
  listCategories,
  listProducts,
  listUsers,
  customerSalesHistory,
  getCustomer,
} from "@/lib/queries"
import { getSettings } from "@/lib/settings"

/**
 * Thin, read-only "use server" wrappers around lib/queries.ts so the voice
 * assistant's global tools can reach the exact same data every other page
 * already renders — never a separate/duplicated query, never invented. Each
 * wrapper enforces the same role gate as the page that data normally lives
 * behind (see components/app/nav-items.ts).
 */

export async function voiceGetDashboardSummary(): Promise<ActionResult<Awaited<ReturnType<typeof dashboardKpis>>>> {
  await requireSession() // dashboard is cashier+
  return ok(await dashboardKpis())
}

export type VoiceSalesReport = {
  trend: Awaited<ReturnType<typeof salesTrend>>
  topProducts: Awaited<ReturnType<typeof topProducts>>
  categoryBreakdown: Awaited<ReturnType<typeof categoryBreakdown>>
  paymentMethodBreakdown: Awaited<ReturnType<typeof paymentMethodBreakdown>>
}

export async function voiceGetSalesReport(input: unknown): Promise<ActionResult<VoiceSalesReport>> {
  await requireRole("manager") // reports page is manager+
  const parsed = parseOr(voiceSalesReportSchema, input)
  if (!parsed.success) return parsed.result

  const [trend, top, category, payment] = await Promise.all([
    salesTrend(parsed.data.days ?? 7),
    topProducts(8),
    categoryBreakdown(),
    paymentMethodBreakdown(),
  ])
  return ok({ trend, topProducts: top, categoryBreakdown: category, paymentMethodBreakdown: payment })
}

export async function voiceGetRecentSales(
  input: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof recentSales>>>> {
  await requireSession() // dashboard-level visibility, cashier+
  const parsed = parseOr(voiceRecentSalesSchema, input)
  if (!parsed.success) return parsed.result
  return ok(await recentSales(parsed.data.limit ?? 8))
}

export async function voiceListCategories(): Promise<ActionResult<Awaited<ReturnType<typeof listCategories>>>> {
  await requireSession() // categories are already visible to cashiers via the POS/product filters
  return ok(await listCategories())
}

export async function voiceFindCustomers(input: unknown): Promise<ActionResult<Customer[]>> {
  await requireRole("cashier") // customers page is cashier+
  const parsed = parseOr(voiceFindCustomersSchema, input)
  if (!parsed.success) return parsed.result

  const q = parsed.data.query.trim().toLowerCase()
  const rows = await db.select().from(customers)
  const matches = rows
    .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    .slice(0, 8)
  return ok(matches)
}

export type VoiceCustomerDetail = {
  customer: NonNullable<Awaited<ReturnType<typeof getCustomer>>>
  sales: Awaited<ReturnType<typeof customerSalesHistory>>
}

export async function voiceGetCustomer(input: unknown): Promise<ActionResult<VoiceCustomerDetail>> {
  await requireRole("cashier")
  const parsed = parseOr(voiceGetCustomerSchema, input)
  if (!parsed.success) return parsed.result

  const customer = await getCustomer(parsed.data.customerId)
  if (!customer) return fail("Customer not found.")
  const sales = await customerSalesHistory(parsed.data.customerId)
  return ok({ customer, sales })
}

export type VoiceInventoryRow = {
  productId: string
  name: string
  sku: string
  quantityOnHand: number
  reorderLevel: number
  isLow: boolean
}

export async function voiceGetInventoryStatus(
  input: unknown
): Promise<ActionResult<VoiceInventoryRow[]>> {
  await requireRole("manager") // inventory page is manager+
  const parsed = parseOr(voiceInventoryStatusSchema, input)
  if (!parsed.success) return parsed.result

  const products = await listProducts()
  const rows = products
    .filter((p) => p.isActive)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantityOnHand: p.quantityOnHand,
      reorderLevel: p.reorderLevel,
      isLow: p.quantityOnHand <= p.reorderLevel,
    }))
  return ok(parsed.data.lowStockOnly ? rows.filter((r) => r.isLow) : rows)
}

export async function voiceListUsers(): Promise<ActionResult<Awaited<ReturnType<typeof listUsers>>>> {
  await requireRole("admin") // users & roles page is admin only
  return ok(await listUsers())
}

export async function voiceGetShopSettings(): Promise<ActionResult<Awaited<ReturnType<typeof getSettings>>>> {
  await requireRole("admin") // settings page is admin only
  return ok(await getSettings())
}
