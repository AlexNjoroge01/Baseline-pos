import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

import { formatCents } from "@/lib/money"
import { formatDateTime } from "@/lib/datetime"
import type { Sale, SaleItem, Customer, Settings, User } from "@/db/schema"

export type ReceiptItem = Pick<
  SaleItem,
  "quantity" | "unitPriceCents" | "lineSubtotalCents" | "lineTaxCents"
> & { productName: string }

export type ReceiptData = {
  sale: Sale
  items: ReceiptItem[]
  customer: Customer | null
  cashier: Pick<User, "name">
  settings: Pick<
    Settings,
    "shopName" | "shopAddress" | "shopPhone" | "currency" | "receiptFooterNote"
  >
}

// 80mm thermal roll ≈ 226pt wide. Height grows with the number of lines so there's
// no big blank tail like a real receipt cut off at the last line.
const PAPER_WIDTH = 226

const PAYMENT_LABELS: Record<string, string> = {
  cash: "CASH",
  mpesa: "M-PESA",
  card: "CARD",
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontFamily: "Courier",
    fontSize: 8,
    color: "#000",
  },
  center: { textAlign: "center" },
  shopName: { fontFamily: "Courier-Bold", fontSize: 13, textAlign: "center" },
  small: { fontSize: 7.5, textAlign: "center" },
  docType: { fontFamily: "Courier-Bold", fontSize: 9, textAlign: "center", letterSpacing: 1 },

  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 8 },

  colHead: { flexDirection: "row", fontFamily: "Courier-Bold", fontSize: 7.5 },

  itemName: { fontSize: 8 },
  itemDetail: { flexDirection: "row", justifyContent: "space-between", fontSize: 8 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 8 },
  grandLabel: { fontFamily: "Courier-Bold", fontSize: 11 },
  grandValue: { fontFamily: "Courier-Bold", fontSize: 11 },

  thankYou: { fontFamily: "Courier-Bold", fontSize: 9, textAlign: "center", letterSpacing: 1 },
})

function Divider({ char = "-" }: { char?: string }) {
  return (
    <Text
      style={{ fontSize: 8, marginVertical: 3, color: "#000" }}
      wrap={false}
    >
      {char.repeat(46)}
    </Text>
  )
}

/** A believable barcode: black bars of pseudo-random widths derived from the invoice no. */
function Barcode({ value }: { value: string }) {
  const bars: { w: number }[] = []
  for (let i = 0; i < 44; i++) {
    const code = value.charCodeAt(i % value.length) + i * 7
    bars.push({ w: (code % 3) + 1 })
  }
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <View style={{ flexDirection: "row", height: 34, alignItems: "stretch" }}>
        {bars.map((b, i) => (
          <View
            key={i}
            style={{
              width: b.w,
              marginRight: 1,
              backgroundColor: i % 2 === 0 ? "#000" : "transparent",
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 8, letterSpacing: 2, marginTop: 2 }}>{value}</Text>
    </View>
  )
}

export function ReceiptDocument({ sale, items, customer, cashier, settings }: ReceiptData) {
  const cur = settings.currency
  const unitCount = items.reduce((n, it) => n + it.quantity, 0)

  // Estimate roll height: fixed chrome + per-item lines (name + detail).
  const height = 300 + items.length * 26 + (customer ? 12 : 0)

  return (
    <Document>
      <Page size={[PAPER_WIDTH, height]} style={styles.page}>
        {/* ---- Header ---- */}
        <Text style={styles.shopName}>{settings.shopName.toUpperCase()}</Text>
        {settings.shopAddress ? <Text style={styles.small}>{settings.shopAddress}</Text> : null}
        {settings.shopPhone ? <Text style={styles.small}>Tel: {settings.shopPhone}</Text> : null}
        <Text style={[styles.small, { marginTop: 2 }]}>VAT No: P000000000X</Text>

        <Divider />
        <Text style={styles.docType}>SALES RECEIPT</Text>
        <Divider />

        {/* ---- Meta ---- */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Receipt:</Text>
          <Text style={styles.metaLabel}>{sale.invoiceNumber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date:</Text>
          <Text style={styles.metaLabel}>{formatDateTime(sale.createdAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Served by:</Text>
          <Text style={styles.metaLabel}>{cashier.name}</Text>
        </View>
        {customer ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Customer:</Text>
            <Text style={styles.metaLabel}>{customer.name}</Text>
          </View>
        ) : null}

        <Divider />

        {/* ---- Items ---- */}
        <View style={styles.colHead}>
          <Text style={{ flex: 1 }}>ITEM</Text>
          <Text style={{ width: 55, textAlign: "right" }}>AMOUNT</Text>
        </View>
        <Divider />

        {items.map((it, i) => (
          <View key={i} style={{ marginBottom: 3 }}>
            <Text style={styles.itemName}>{it.productName}</Text>
            <View style={styles.itemDetail}>
              <Text>
                {it.quantity} x {formatCents(it.unitPriceCents)}
              </Text>
              <Text>{formatCents(it.lineSubtotalCents + it.lineTaxCents)}</Text>
            </View>
          </View>
        ))}

        <Divider />

        {/* ---- Totals ---- */}
        <View style={styles.totalRow}>
          <Text>SUBTOTAL</Text>
          <Text>{formatCents(sale.subtotalCents)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>VAT (16%)</Text>
          <Text>{formatCents(sale.taxTotalCents)}</Text>
        </View>
        {sale.discountTotalCents > 0 ? (
          <View style={styles.totalRow}>
            <Text>DISCOUNT</Text>
            <Text>-{formatCents(sale.discountTotalCents)}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 4 }}>
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>TOTAL {cur}</Text>
            <Text style={styles.grandValue}>{formatCents(sale.grandTotalCents)}</Text>
          </View>
        </View>

        <Divider />

        {/* ---- Payment / tender ---- */}
        <View style={styles.totalRow}>
          <Text>{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod.toUpperCase()}</Text>
          <Text>{formatCents(sale.grandTotalCents)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>CHANGE</Text>
          <Text>{formatCents(0)}</Text>
        </View>
        {sale.paymentReference ? (
          <View style={styles.totalRow}>
            <Text>REF</Text>
            <Text>{sale.paymentReference}</Text>
          </View>
        ) : null}

        <Divider />

        <View style={styles.metaRow}>
          <Text>ITEMS: {items.length}</Text>
          <Text>UNITS: {unitCount}</Text>
        </View>

        <Divider char="=" />

        {/* ---- Footer ---- */}
        {settings.receiptFooterNote ? (
          <Text style={[styles.small, { marginBottom: 2 }]}>{settings.receiptFooterNote}</Text>
        ) : null}
        <Text style={styles.thankYou}>THANK YOU</Text>
        <Text style={[styles.small, { marginTop: 1 }]}>Karibu tena!</Text>

        <Barcode value={sale.invoiceNumber} />

        <Text style={[styles.small, { marginTop: 8, fontSize: 6.5 }]}>
          This is a computer generated receipt.
        </Text>
        <Text style={[styles.small, { fontSize: 6.5 }]}>Powered by Duka POS · Atlas Labs</Text>
      </Page>
    </Document>
  )
}
