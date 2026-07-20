import { NextResponse, type NextRequest } from "next/server"

import { verifyToken } from "@/actions/auth"

/**
 * Consumes a magic-link token from the emailed URL. On success the session
 * cookie is set (inside verifyToken) and we redirect to the dashboard; on
 * failure we bounce back to /login with an error flag.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const appUrl = process.env.APP_URL ?? request.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-token", appUrl))
  }

  const userId = await verifyToken(token)
  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", appUrl))
  }

  return NextResponse.redirect(new URL("/dashboard", appUrl))
}
