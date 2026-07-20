import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ["admin", "manager", "cashier"])
export const unitEnum = pgEnum("unit", ["piece", "kg", "g", "litre", "ml", "pack"])
export const movementTypeEnum = pgEnum("movement_type", [
  "restock",
  "sale",
  "adjustment",
  "return",
  "waste",
])
export const referenceTypeEnum = pgEnum("reference_type", ["sale", "manual"])
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "mpesa", "card"])
export const saleStatusEnum = pgEnum("sale_status", ["completed", "refunded", "voided"])
export const themeModeEnum = pgEnum("theme_mode", ["light", "dark", "system"])
export const accentIntensityEnum = pgEnum("accent_intensity", ["soft", "standard", "bold"])
export const densityEnum = pgEnum("density", ["comfortable", "compact"])

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default("cashier"),
  pinHash: text("pin_hash"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
})

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").unique(),
  categoryId: uuid("category_id")
    .references(() => categories.id)
    .notNull(),
  unit: unitEnum("unit").notNull().default("piece"),
  priceCents: integer("price_cents").notNull(),
  costPriceCents: integer("cost_price_cents").notNull().default(0),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("16.00"),
  imageUrl: text("image_url"),
  reorderLevel: integer("reorder_level").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const inventoryLevels = pgTable("inventory_levels", {
  productId: uuid("product_id")
    .references(() => products.id)
    .primaryKey(),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  type: movementTypeEnum("type").notNull(),
  quantityDelta: integer("quantity_delta").notNull(), // signed
  referenceType: referenceTypeEnum("reference_type").notNull(),
  referenceId: uuid("reference_id"),
  note: text("note"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// Customers & sales
// ---------------------------------------------------------------------------
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(), // E.164, +2547XXXXXXXX
  email: text("email"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  totalSpentCents: integer("total_spent_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(), // INV-000123
  customerId: uuid("customer_id").references(() => customers.id),
  cashierId: uuid("cashier_id")
    .references(() => users.id)
    .notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  taxTotalCents: integer("tax_total_cents").notNull(),
  discountTotalCents: integer("discount_total_cents").notNull().default(0),
  grandTotalCents: integer("grand_total_cents").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentReference: text("payment_reference"),
  status: saleStatusEnum("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id")
    .references(() => sales.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(), // snapshot at sale time
  quantity: integer("quantity").notNull(),
  lineSubtotalCents: integer("line_subtotal_cents").notNull(),
  lineTaxCents: integer("line_tax_cents").notNull(),
})

export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id")
    .references(() => sales.id)
    .notNull()
    .unique(),
  pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true }),
  emailedTo: text("emailed_to"),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
})

// ---------------------------------------------------------------------------
// Settings (single row) — shop profile + appearance (Design.md §8)
// ---------------------------------------------------------------------------
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopName: text("shop_name").notNull().default("My Duka"),
  shopAddress: text("shop_address"),
  shopPhone: text("shop_phone"),
  shopEmail: text("shop_email"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("KES"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("16.00"),
  receiptFooterNote: text("receipt_footer_note").default("Asante kwa kununua nasi!"),
  lowStockThresholdDefault: integer("low_stock_threshold_default").notNull().default(5),
  // Appearance
  themeMode: themeModeEnum("theme_mode").notNull().default("system"),
  accentIntensity: accentIntensityEnum("accent_intensity").notNull().default("standard"),
  density: densityEnum("density").notNull().default("comfortable"),
})

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  sales: many(sales),
  movements: many(stockMovements),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventory: one(inventoryLevels, {
    fields: [products.id],
    references: [inventoryLevels.productId],
  }),
  movements: many(stockMovements),
  saleItems: many(saleItems),
}))

export const inventoryLevelsRelations = relations(inventoryLevels, ({ one }) => ({
  product: one(products, {
    fields: [inventoryLevels.productId],
    references: [products.id],
  }),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [stockMovements.createdBy],
    references: [users.id],
  }),
}))

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}))

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  cashier: one(users, { fields: [sales.cashierId], references: [users.id] }),
  items: many(saleItems),
  receipt: one(receipts, { fields: [sales.id], references: [receipts.saleId] }),
}))

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}))

export const receiptsRelations = relations(receipts, ({ one }) => ({
  sale: one(sales, { fields: [receipts.saleId], references: [sales.id] }),
}))

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Category = typeof categories.$inferSelect
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type InventoryLevel = typeof inventoryLevels.$inferSelect
export type StockMovement = typeof stockMovements.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Sale = typeof sales.$inferSelect
export type SaleItem = typeof saleItems.$inferSelect
export type Receipt = typeof receipts.$inferSelect
export type Settings = typeof settings.$inferSelect
export type Role = (typeof roleEnum.enumValues)[number]
export type Unit = (typeof unitEnum.enumValues)[number]
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number]
export type MovementType = (typeof movementTypeEnum.enumValues)[number]
