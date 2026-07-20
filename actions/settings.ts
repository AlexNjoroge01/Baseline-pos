"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { settings } from "@/db/schema"
import { shopSettingsSchema, appearanceSchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireRole } from "@/lib/auth-session"
import { getSettings } from "@/lib/settings"
import { APPEARANCE_COOKIE, serializeAppearance } from "@/lib/appearance"

export async function updateShopSettings(input: unknown): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = parseOr(shopSettingsSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const current = await getSettings()
    const s = parsed.data
    await db
      .update(settings)
      .set({
        shopName: s.shopName,
        shopAddress: s.shopAddress || null,
        shopPhone: s.shopPhone || null,
        shopEmail: s.shopEmail || null,
        currency: s.currency,
        defaultTaxRate: s.defaultTaxRate,
        receiptFooterNote: s.receiptFooterNote || null,
        lowStockThresholdDefault: s.lowStockThresholdDefault,
      })
      .where(eq(settings.id, current.id))

    revalidatePath("/settings")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

/**
 * Appearance update does two things (Design.md §8): persist to the settings row
 * AND write the `theme-prefs` cookie so the next server render already carries
 * the right data-* attributes — no flash of the old theme.
 */
export async function updateAppearanceSettings(input: unknown): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = parseOr(appearanceSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const current = await getSettings()
    const a = parsed.data
    await db
      .update(settings)
      .set({
        themeMode: a.themeMode,
        accentIntensity: a.accentIntensity,
        density: a.density,
      })
      .where(eq(settings.id, current.id))

    const store = await cookies()
    store.set(APPEARANCE_COOKIE, serializeAppearance(a), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    })

    revalidatePath("/", "layout")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}
