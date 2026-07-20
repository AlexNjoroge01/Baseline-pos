import { z } from "zod"

// ---- shared primitives ----------------------------------------------------
const moneyString = z
  .string()
  .min(1, "Required")
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 120.50")

// Kenyan phone in E.164: +2547XXXXXXXX or +2541XXXXXXXX
const kenyanPhone = z
  .string()
  .trim()
  .regex(/^\+254[17]\d{8}$/, "Use format +2547XXXXXXXX")

export const unitValues = ["piece", "kg", "g", "litre", "ml", "pack"] as const
export const roleValues = ["admin", "manager", "cashier"] as const
export const paymentMethodValues = ["cash", "mpesa", "card"] as const
export const movementTypeValues = ["restock", "adjustment", "return", "waste"] as const

// ---- auth -----------------------------------------------------------------
export const requestMagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
})

export const verifyPinSchema = z.object({
  userId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
})

// ---- categories -----------------------------------------------------------
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  description: z.string().trim().max(240).optional().or(z.literal("")),
})

// ---- products -------------------------------------------------------------
export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  sku: z.string().trim().min(1, "SKU is required").max(40),
  barcode: z.string().trim().max(40).optional().or(z.literal("")),
  categoryId: z.string().uuid("Choose a category"),
  unit: z.enum(unitValues),
  price: moneyString,
  costPrice: moneyString.optional().or(z.literal("")),
  taxRate: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid rate")
    .default("16.00"),
  reorderLevel: z.coerce.number().int().min(0).max(100000).default(5),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
})

// ---- inventory ------------------------------------------------------------
export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(movementTypeValues),
  quantity: z.coerce
    .number()
    .int("Whole units only")
    .refine((n) => n !== 0, "Quantity cannot be zero"),
  note: z.string().trim().max(240).optional().or(z.literal("")),
})

// ---- customers ------------------------------------------------------------
export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  phone: kenyanPhone,
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
})

// ---- sales / checkout -----------------------------------------------------
export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
})

export const createSaleSchema = z.object({
  items: z.array(cartLineSchema).min(1, "Cart is empty"),
  customerId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  paymentReference: z.string().trim().max(60).optional().or(z.literal("")),
  discountCents: z.coerce.number().int().min(0).default(0),
})

// ---- users ----------------------------------------------------------------
export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(roleValues),
})

export const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(roleValues),
})

export const setPinSchema = z.object({
  userId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
})

// ---- settings -------------------------------------------------------------
export const shopSettingsSchema = z.object({
  shopName: z.string().trim().min(1, "Required").max(120),
  shopAddress: z.string().trim().max(240).optional().or(z.literal("")),
  shopPhone: z.string().trim().max(40).optional().or(z.literal("")),
  shopEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  currency: z.string().trim().min(1).max(8).default("KES"),
  defaultTaxRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid rate"),
  receiptFooterNote: z.string().trim().max(240).optional().or(z.literal("")),
  lowStockThresholdDefault: z.coerce.number().int().min(0).max(100000).default(5),
})

export const appearanceSchema = z.object({
  themeMode: z.enum(["light", "dark", "system"]),
  accentIntensity: z.enum(["soft", "standard", "bold"]),
  density: z.enum(["comfortable", "compact"]),
})

export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>
export type AppearanceInput = z.infer<typeof appearanceSchema>
