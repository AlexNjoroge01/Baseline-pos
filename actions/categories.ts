"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { categories, products } from "@/db/schema"
import { categorySchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireRole } from "@/lib/auth-session"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("manager")
  const parsed = parseOr(categorySchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { name, description } = parsed.data
    let slug = slugify(name)
    // Ensure slug uniqueness with a numeric suffix if needed.
    const clash = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1)
    if (clash[0]) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const [row] = await db
      .insert(categories)
      .values({ name, slug, description: description || null })
      .returning({ id: categories.id })

    revalidatePath("/categories")
    revalidatePath("/products")
    return ok({ id: row.id })
  } catch (e) {
    return fail(errorMessage(e))
  }
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("manager")
  const parsed = parseOr(categorySchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { name, description } = parsed.data
    await db
      .update(categories)
      .set({ name, description: description || null })
      .where(eq(categories.id, id))
    revalidatePath("/categories")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireRole("manager")
  try {
    // Block deletion when products still reference the category (they'd orphan
    // historical sales). The UI should surface this and suggest reassigning.
    const inUse = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id)).limit(1)
    if (inUse[0]) {
      return fail("This category still has products. Move or remove them first.")
    }
    await db.delete(categories).where(eq(categories.id, id))
    revalidatePath("/categories")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}
