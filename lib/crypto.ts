import { createHash, randomBytes } from "crypto"

/** Cryptographically-random URL-safe token (default 32 bytes -> 64 hex chars). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}

/** Deterministic SHA-256 hash — we store the hash of magic-link tokens, never the raw. */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}
