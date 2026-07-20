import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM ?? "Duka POS <onboarding@resend.dev>"

const resend = apiKey ? new Resend(apiKey) : null

/**
 * If RESEND_API_KEY is unset (e.g. local dev), we log instead of sending so the
 * app never crashes on a missing key — per the non-functional checklist, the DB
 * client and secrets stay server-side.
 */
export async function sendMagicLink(email: string, url: string): Promise<void> {
  // Always log the link to the server console in development so you can sign in
  // even if email delivery isn't set up (or Resend is in sandbox mode).
  if (process.env.NODE_ENV !== "production") {
    console.info(`\n🔑 [magic-link] Sign-in link for ${email}:\n${url}\n`)
  }
  if (!resend) return

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your Duka POS sign-in link",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1652D6">Sign in to Duka POS</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes.</p>
        <p><a href="${url}" style="display:inline-block;background:#1652D6;color:#fff;
          padding:12px 20px;border-radius:12px;text-decoration:none">Sign in</a></p>
        <p style="color:#6B7A93;font-size:13px">If you didn't request this, ignore this email.</p>
      </div>`,
  })

  // The Resend SDK reports failures in the response object, not by throwing —
  // surface them so a bad EMAIL_FROM / unverified domain isn't swallowed silently.
  if (error) {
    console.error("[resend] send failed:", error)
    throw new Error(`Email failed: ${error.message ?? "check EMAIL_FROM and domain verification"}`)
  }
}

export async function sendReceipt(
  email: string,
  invoiceNumber: string,
  pdf: Buffer,
  shopName: string
): Promise<void> {
  if (!resend) {
    console.info(`[email:dev] Receipt ${invoiceNumber} would be emailed to ${email}`)
    return
  }
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `${shopName} — Receipt ${invoiceNumber}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1652D6">Thank you for your purchase</h2>
        <p>Your receipt <strong>${invoiceNumber}</strong> from ${shopName} is attached.</p>
      </div>`,
    attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
  })
  if (error) {
    console.error("[resend] receipt send failed:", error)
    throw new Error(`Receipt email failed: ${error.message ?? "check EMAIL_FROM and domain"}`)
  }
}
