import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and, gt } from "drizzle-orm"

import { db } from "@/db"
import { sessions, users, type Role, type User } from "@/db/schema"

export const SESSION_COOKIE = "duka_session"
export const CASHIER_COOKIE = "duka_cashier" // PIN quick-switch terminal cashier

const ROLE_RANK: Record<Role, number> = { cashier: 1, manager: 2, admin: 3 }

export type SessionUser = Pick<User, "id" | "name" | "email" | "role" | "isActive">

/** Reads the session cookie, loads session + user; returns null if missing/expired. */
export async function getSession(): Promise<{ sessionId: string; user: SessionUser } | null> {
  const store = await cookies()
  const sessionId = store.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const rows = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)

  const row = rows[0]
  if (!row || !row.isActive) return null

  return {
    sessionId: row.sessionId,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
    },
  }
}

/** Redirects to /login when unauthenticated; otherwise returns the session user. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect("/login")
  return session.user
}

export function hasRole(role: Role, ...allowed: Role[]): boolean {
  // Roles are hierarchical: admin >= manager >= cashier. `allowed` lists the
  // minimum acceptable roles; we grant access if the user's rank meets any of them.
  const min = Math.min(...allowed.map((r) => ROLE_RANK[r]))
  return ROLE_RANK[role] >= min
}

/** Throws (via redirect) if the current user's role is below every allowed role. */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireSession()
  if (!hasRole(user.role, ...allowed)) redirect("/dashboard?error=forbidden")
  return user
}

/**
 * The cashier stamped on a sale. If a PIN quick-switch cashier cookie is active
 * (and points at a real active user), that wins; otherwise it's the logged-in user.
 */
export async function getActiveCashier(): Promise<SessionUser> {
  const user = await requireSession()
  const store = await cookies()
  const cashierId = store.get(CASHIER_COOKIE)?.value
  if (!cashierId || cashierId === user.id) return user

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.id, cashierId), eq(users.isActive, true)))
    .limit(1)

  return rows[0] ?? user
}
