import { requireRole } from "@/lib/auth-session"
import { listUsers } from "@/lib/queries"
import { PageHeader } from "@/components/app/page-header"
import { UserManager } from "@/components/users/user-manager"

export default async function UsersPage() {
  const me = await requireRole("admin")
  const users = await listUsers()

  return (
    <div>
      <PageHeader title="Users & Roles" description="Invite staff and manage access and PINs." />
      <UserManager users={users} currentUserId={me.id} />
    </div>
  )
}
