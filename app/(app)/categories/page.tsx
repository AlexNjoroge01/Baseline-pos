import { requireRole } from "@/lib/auth-session"
import { listCategories } from "@/lib/queries"
import { PageHeader } from "@/components/app/page-header"
import { CategoryManager } from "@/components/categories/category-manager"

export default async function CategoriesPage() {
  await requireRole("manager")
  const categories = await listCategories()

  return (
    <div>
      <PageHeader title="Categories" description="Organise your catalogue into sections." />
      <CategoryManager categories={categories} />
    </div>
  )
}
