"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and, isNull, gt } from "drizzle-orm"
import bcrypt from "bcryptjs"

import { db } from "@/db"
import { users, magicLinkTokens, sessions } from "@/db/schema"
import { generateToken, sha256 } from "@/lib/crypto"
import { sendMagicLink } from "@/lib/email"
import { requestMagicLinkSchema, verifyPinSchema } from "@/lib/validations"
import { ok, fail, parseOr, errorMessage, type ActionResult } from "@/lib/action-result"
import { SESSION_COOKIE, CASHIER_COOKIE } from "@/lib/auth-session"

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000 // 15 minutes
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Issue a magic link. To avoid leaking which emails are registered, we always
 * return success — but only actually send when the user exists and is active.
 */
export async function requestMagicLink(input: unknown): Promise<ActionResult> {
  const parsed = parseOr(requestMagicLinkSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { email } = parsed.data
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (user && user.isActive) {
      const rawToken = generateToken()
      await db.insert(magicLinkTokens).values({
        userId: user.id,
        email,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      })
      const appUrl = process.env.APP_URL ?? "http://localhost:3000"
      await sendMagicLink(email, `${appUrl}/api/auth/verify?token=${rawToken}`)
    } else if (process.env.NODE_ENV !== "production") {
      // Anti-enumeration keeps the UI generic; in dev, say why nothing was sent.
      console.info(
        `[auth] No active user for "${email}" — no link sent. Invite them in /users or re-seed.`
      )
    }

    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

/**
 * Consume a magic-link token: verify it's unconsumed + unexpired, mark consumed,
 * create a 7-day session, and set the httpOnly session cookie. Returns the userId
 * on success or null on failure. Called from the /api/auth/verify route handler.
 */
export async function verifyToken(rawToken: string): Promise<string | null> {
  const tokenHash = sha256(rawToken)
  const now = new Date()

  const [record] = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        isNull(magicLinkTokens.consumedAt),
        gt(magicLinkTokens.expiresAt, now)
      )
    )
    .limit(1)

  if (!record || !record.userId) return null

  await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(eq(magicLinkTokens.id, record.id))

  const [session] = await db
    .insert(sessions)
    .values({ userId: record.userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .returning({ id: sessions.id })

  const store = await cookies()
  store.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  })

  return record.userId
}

/** PIN quick-switch: verify a cashier's PIN and stamp them as the terminal cashier. */
export async function verifyPin(input: unknown): Promise<ActionResult> {
  const parsed = parseOr(verifyPinSchema, input)
  if (!parsed.success) return parsed.result

  try {
    const { userId, pin } = parsed.data
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user || !user.isActive || !user.pinHash) {
      return fail("Cashier not found or no PIN set.")
    }
    const valid = await bcrypt.compare(pin, user.pinHash)
    if (!valid) return fail("Incorrect PIN.")

    const store = await cookies()
    store.set(CASHIER_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60, // one shift
    })
    return ok(undefined)
  } catch (e) {
    return fail(errorMessage(e))
  }
}

export async function clearCashierSwitch(): Promise<void> {
  const store = await cookies()
  store.delete(CASHIER_COOKIE)
}

export async function logout(): Promise<void> {
  const store = await cookies()
  const sessionId = store.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }
  store.delete(SESSION_COOKIE)
  store.delete(CASHIER_COOKIE)
  redirect("/login")
}
