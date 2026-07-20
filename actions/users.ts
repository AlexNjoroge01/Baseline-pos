"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

import { db } from "@/db"
import { users } from "@/db/schema"
import { inviteUserSchema, setRoleSchema, setPinSchema } from "@/lib/validations"
import { generateToken, sha256 } from "@/lib/crypto"
import { magicLinkTokens } from "@/db/schema"
import { sendMagicLink } from "@/lib/email"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { requireRole } from "@/lib/auth-session"

/**
 * Invite a new staff member: create the user row (active, no PIN yet) and email
 * them a magic link so they can sign in immediately (passwordless).
 */
export async function inviteUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("admin")
  const parsed = parseOr(inviteUserSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { name, email, role } = parsed.data
    const [row] = await db
      .insert(users)
      .values({ name, email, role })
      .returning({ id: users.id })

    // Send them a first sign-in link.
    const rawToken = generateToken()
    await db.insert(magicLinkTokens).values({
      userId: row.id,
      email,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h for first invite
    })
    const appUrl = process.env.APP_URL ?? "http://localhost:3000"
    await sendMagicLink(email, `${appUrl}/api/auth/verify?token=${rawToken}`)

    revalidatePath("/users")
    return ok({ id: row.id })
  } catch (e) {
    const msg = errorMessage(e)
    if (msg.includes("email") && msg.includes("unique")) {
      return fail("A user with that email already exists.")
    }
    return fail(msg)
  }
}

export async function setRole(input: unknown): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = parseOr(setRoleSchema, input)
  if (!parsed.success) return parsed.result

  try {
    await db.update(users).set({ role: parsed.data.role }).where(eq(users.id, parsed.data.userId))
    revalidatePath("/users")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

/** Set/reset a cashier PIN (hashed with bcrypt). */
export async function setPin(input: unknown): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = parseOr(setPinSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const pinHash = await bcrypt.hash(parsed.data.pin, 10)
    await db.update(users).set({ pinHash }).where(eq(users.id, parsed.data.userId))
    revalidatePath("/users")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole("admin")
  try {
    await db.update(users).set({ isActive }).where(eq(users.id, userId))
    revalidatePath("/users")
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}
