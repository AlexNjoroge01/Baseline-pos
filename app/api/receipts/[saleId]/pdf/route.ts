import { NextResponse, type NextRequest } from "next/server"

import { requireSession } from "@/lib/auth-session"
import { renderReceiptPdf, ReceiptNotFoundError } from "@/lib/receipt"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  await requireSession() // any authenticated staff member
  const { saleId } = await params

  try {
    const { buffer, invoiceNumber } = await renderReceiptPdf(saleId)
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    if (e instanceof ReceiptNotFoundError) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }
    console.error("Receipt render failed:", e)
    return NextResponse.json({ error: "Failed to render receipt" }, { status: 500 })
  }
}
