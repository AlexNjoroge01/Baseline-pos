import { requireSession, getActiveCashier } from "@/lib/auth-session"
import { listActiveProductsForPos, listCategories, listCustomers, listCashiers } from "@/lib/queries"
import { getSettings } from "@/lib/settings"
import { PosTerminal } from "@/components/pos/pos-terminal"

export default async function PosPage() {
  await requireSession()
  const [products, categories, customers, cashiers, activeCashier, settings] = await Promise.all([
    listActiveProductsForPos(),
    listCategories(),
    listCustomers(),
    listCashiers(),
    getActiveCashier(),
    getSettings(),
  ])

  return (
    <PosTerminal
      products={products}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      cashiers={cashiers.map((c) => ({ id: c.id, name: c.name }))}
      activeCashierName={activeCashier.name}
      currency={settings.currency}
    />
  )
}
