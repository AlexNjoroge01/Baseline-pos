import { db } from "@/db"
import { settings, type Settings } from "@/db/schema"

/**
 * The shop runs on a single settings row. This reads it, creating the default
 * row on first access so callers always get a value.
 */
export async function getSettings(): Promise<Settings> {
  const existing = await db.select().from(settings).limit(1)
  if (existing[0]) return existing[0]

  const [created] = await db.insert(settings).values({}).returning()
  return created
}
