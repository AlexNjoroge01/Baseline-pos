import { requireRole } from "@/lib/auth-session"
import { listCustomers } from "@/lib/queries"
import { PageHeader } from "@/components/app/page-header"
import { CustomerManager } from "@/components/customers/customer-manager"

export default async function CustomersPage() {
  await requireRole("cashier")
  const customers = await listCustomers()

  return (
    <div>
      <PageHeader title="Customers" description="Loyalty members and their purchase history." />
      <CustomerManager customers={customers} />
    </div>
  )
}
