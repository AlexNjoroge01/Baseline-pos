// The one and only place currency is rendered / parsed.
// Money is stored everywhere as integer cents ("no float math on money").

/** 12345 -> "1,234.50" (no symbol) */
export function formatCents(cents: number): string {
  const value = cents / 100
  return value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 12345 -> "KES 123.45" */
export function formatKES(cents: number, currency = "KES"): string {
  return `${currency} ${formatCents(cents)}`
}

/** "123.45" | 123.45 -> 12345 (integer cents). Throws on garbage. */
export function toCents(amount: string | number): number {
  const n = typeof amount === "string" ? Number(amount.replace(/,/g, "").trim()) : amount
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid money amount: ${amount}`)
  }
  return Math.round(n * 100)
}

/** 12345 -> 123.45 (for form inputs only, never for arithmetic) */
export function fromCents(cents: number): number {
  return cents / 100
}
