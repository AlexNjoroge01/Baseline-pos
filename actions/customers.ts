"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { customers } from "@/db/schema"
import { customerSchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireRole } from "@/lib/auth-session"

export async function createCustomer(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("cashier")
  const parsed = parseOr(customerSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { name, phone, email } = parsed.data
    const [row] = await db
      .insert(customers)
      .values({ name, phone, email: email || null })
      .returning({ id: customers.id })
    revalidatePath("/customers")
    return ok({ id: row.id })
  } catch (e) {
    const msg = errorMessage(e)
    if (msg.includes("phone") && msg.includes("unique")) {
      return fail("A customer with that phone number already exists.")
    }
    return fail(msg)
  }
}

export async function updateCustomer(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("cashier")
  const parsed = parseOr(customerSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { name, phone, email } = parsed.data
    await db
      .update(customers)
      .set({ name, phone, email: email || null })
      .where(eq(customers.id, id))
    revalidatePath("/customers")
    revalidatePath(`/customers/${id}`)
    return ok(undefined)
  } catch (e) {
    const msg = errorMessage(e)
    if (msg.includes("phone") && msg.includes("unique")) {
      return fail("A customer with that phone number already exists.")
    }
    return fail(msg)
  }
}
