import { cookies } from "next/headers"

import type { AppearanceInput } from "@/lib/validations"

export const APPEARANCE_COOKIE = "theme-prefs"

export const DEFAULT_APPEARANCE: AppearanceInput = {
  themeMode: "system",
  accentIntensity: "standard",
  density: "comfortable",
}

/**
 * Read appearance prefs for server rendering. We read from the `theme-prefs`
 * cookie (written by updateAppearanceSettings alongside the DB row) so the very
 * first server render already carries the right data-* attributes — no flash of
 * the old theme, and no DB round-trip in the root layout. Falls back to defaults.
 */
export async function getAppearancePrefs(): Promise<AppearanceInput> {
  const store = await cookies()
  const raw = store.get(APPEARANCE_COOKIE)?.value
  if (!raw) return DEFAULT_APPEARANCE
  try {
    const parsed = JSON.parse(raw) as Partial<AppearanceInput>
    return {
      themeMode: parsed.themeMode ?? DEFAULT_APPEARANCE.themeMode,
      accentIntensity: parsed.accentIntensity ?? DEFAULT_APPEARANCE.accentIntensity,
      density: parsed.density ?? DEFAULT_APPEARANCE.density,
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function serializeAppearance(prefs: AppearanceInput): string {
  return JSON.stringify(prefs)
}
