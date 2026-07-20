import { requireSession, hasRole } from "@/lib/auth-session"
import { listProducts, listCategories } from "@/lib/queries"
import { getSettings } from "@/lib/settings"
import { PageHeader } from "@/components/app/page-header"
import { ProductManager } from "@/components/products/product-manager"

export default async function ProductsPage() {
  const user = await requireSession()
  const [products, categories, settings] = await Promise.all([
    listProducts(),
    listCategories(),
    getSettings(),
  ])
  const canEdit = hasRole(user.role, "manager")

  return (
    <div>
      <PageHeader
        title="Products"
        description={canEdit ? "Manage your catalogue and pricing." : "Browse the catalogue."}
      />
      <ProductManager
        products={products}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        canEdit={canEdit}
        currency={settings.currency}
        defaultTaxRate={settings.defaultTaxRate}
      />
    </div>
  )
}
