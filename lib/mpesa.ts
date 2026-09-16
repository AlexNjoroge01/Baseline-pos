import axios from "axios"

// Thin client for Safaricom Daraja's Lipa na M-Pesa Online (STK Push) API.
// Server-only: reads DARAJA_* secrets from process.env, never imported from a
// "use client" file. Mirrors lib/inventory-core.ts's shape — plain async
// helpers used by "use server" actions, not an action module itself.

export class MpesaConfigError extends Error {}
export class MpesaApiError extends Error {}

type DarajaEnv = "sandbox" | "production"

function baseUrl(): string {
  const env = (process.env.DARAJA_ENV ?? "sandbox") as DarajaEnv
  return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new MpesaConfigError(
      `${name} is not set. Add Daraja credentials to .env before initiating M-Pesa payments.`
    )
  }
  return value
}

// Access tokens are valid for ~1 hour; cache in-memory (per server instance)
// to avoid an OAuth round trip on every STK push/query call.
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) {
    return cachedToken.token
  }

  const consumerKey = requireEnv("DARAJA_CONSUMER_KEY")
  const consumerSecret = requireEnv("DARAJA_CONSUMER_SECRET")
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

  try {
    const res = await axios.get<{ access_token: string; expires_in: string }>(
      `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } }
    )
    cachedToken = {
      token: res.data.access_token,
      expiresAt: Date.now() + Number(res.data.expires_in) * 1000,
    }
    return cachedToken.token
  } catch (e) {
    throw new MpesaApiError(`Failed to authenticate with Daraja: ${describeAxiosError(e)}`)
  }
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

function password(shortcode: string, passkey: string, ts: string): string {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64")
}

/** Daraja wants 2547XXXXXXXX / 2541XXXXXXXX — no leading "+". */
function toDarajaPhone(e164Phone: string): string {
  return e164Phone.replace(/^\+/, "")
}

export type StkPushResult = {
  merchantRequestId: string
  checkoutRequestId: string
  customerMessage: string
}

/**
 * Initiates an STK Push prompt on the customer's phone. `amountCents` is
 * expected to already be the authoritative, server-computed total — this
 * function does not know or care where it came from, it just charges it.
 */
export async function initiateStkPush(args: {
  phone: string
  amountCents: number
  accountReference: string
  transactionDesc: string
}): Promise<StkPushResult> {
  const shortcode = requireEnv("DARAJA_SHORTCODE")
  const passkey = requireEnv("DARAJA_PASSKEY")
  const callbackBase = process.env.MPESA_CALLBACK_BASE_URL ?? "http://localhost:3000"
  const token = await getAccessToken()
  const ts = timestamp()
  const amountKes = Math.max(1, Math.round(args.amountCents / 100))
  const phone = toDarajaPhone(args.phone)

  try {
    const res = await axios.post<{
      MerchantRequestID: string
      CheckoutRequestID: string
      ResponseCode: string
      ResponseDescription: string
      CustomerMessage: string
    }>(
      `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password(shortcode, passkey, ts),
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: amountKes,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: `${callbackBase}/api/mpesa/callback`,
        AccountReference: args.accountReference,
        TransactionDesc: args.transactionDesc,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.data.ResponseCode !== "0") {
      throw new MpesaApiError(res.data.ResponseDescription || "STK push was rejected.")
    }

    return {
      merchantRequestId: res.data.MerchantRequestID,
      checkoutRequestId: res.data.CheckoutRequestID,
      customerMessage: res.data.CustomerMessage,
    }
  } catch (e) {
    if (e instanceof MpesaApiError) throw e
    throw new MpesaApiError(`STK push failed: ${describeAxiosError(e)}`)
  }
}

export type StkPushQueryResult = {
  resultCode: string
  resultDesc: string
  /** true only when Daraja has confirmed the payment completed. */
  isCompleted: boolean
  /** true when Daraja has confirmed the payment did not go through. */
  isFailed: boolean
}

/**
 * Actively asks Daraja for the current status of a previously-initiated STK
 * push. Used as the primary way to learn the outcome in this deployment,
 * since the passive callback route requires a publicly reachable HTTPS URL
 * that may not be wired up yet — this works regardless.
 */
export async function queryStkPush(checkoutRequestId: string): Promise<StkPushQueryResult> {
  const shortcode = requireEnv("DARAJA_SHORTCODE")
  const passkey = requireEnv("DARAJA_PASSKEY")
  const token = await getAccessToken()
  const ts = timestamp()

  try {
    const res = await axios.post<{
      ResponseCode: string
      ResultCode?: string
      ResultDesc?: string
      errorCode?: string
      errorMessage?: string
    }>(
      `${baseUrl()}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: shortcode,
        Password: password(shortcode, passkey, ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    // Safaricom returns errorCode "500.001.1001" (still processing) as an
    // error-shaped body with 200 status in some sandbox cases — treat as pending.
    if (res.data.errorCode) {
      return { resultCode: "pending", resultDesc: res.data.errorMessage ?? "Still processing", isCompleted: false, isFailed: false }
    }

    const resultCode = res.data.ResultCode ?? "pending"
    return {
      resultCode,
      resultDesc: res.data.ResultDesc ?? "",
      isCompleted: resultCode === "0",
      isFailed: resultCode !== "0" && resultCode !== "pending",
    }
  } catch {
    // Query failing (e.g. request not found yet) just means "still pending" —
    // never surface this as a payment failure.
    return { resultCode: "pending", resultDesc: "Still processing", isCompleted: false, isFailed: false }
  }
}

export type StkCallbackItem = { Name: string; Value?: string | number }

/** Parses Safaricom's callback POST body into the fields we persist. */
export function parseStkCallback(body: unknown): {
  checkoutRequestId: string
  merchantRequestId: string
  resultCode: number
  resultDesc: string
  mpesaReceiptNumber: string | null
} | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null

  const items = (
    (cb.CallbackMetadata as { Item?: StkCallbackItem[] } | undefined)?.Item ?? []
  ) as StkCallbackItem[]
  const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value

  return {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: String(cb.MerchantRequestID ?? ""),
    resultCode: Number(cb.ResultCode ?? -1),
    resultDesc: String(cb.ResultDesc ?? ""),
    mpesaReceiptNumber: receipt != null ? String(receipt) : null,
  }
}

function describeAxiosError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { errorMessage?: string; ResponseDescription?: string } | undefined
    return data?.errorMessage || data?.ResponseDescription || e.message
  }
  return e instanceof Error ? e.message : "Unknown error"
}
