import { z } from "zod"

// Consistent shape returned by every server action so client forms can render
// success/error toasts and field errors uniformly.
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

/** Runs a Zod schema and returns either parsed data or an ActionResult error. */
export function parseOr<T>(
  schema: z.ZodType<T>,
  input: unknown
): { success: true; data: T } | { success: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    return {
      success: false,
      result: fail("Please fix the highlighted fields.", flat.fieldErrors as Record<string, string[]>),
    }
  }
  return { success: true, data: parsed.data }
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}
