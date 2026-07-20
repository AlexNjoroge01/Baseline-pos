import { requireSession, getActiveCashier } from "@/lib/auth-session"
import { getSettings } from "@/lib/settings"
import { Sidebar } from "@/components/app/sidebar"
import { AppHeader } from "@/components/app/app-header"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession()
  const [settings, activeCashier] = await Promise.all([getSettings(), getActiveCashier()])

  const cashierBadge =
    activeCashier.id !== user.id ? { id: activeCashier.id, name: activeCashier.name } : null

  return (
    <div className="flex min-h-svh bg-background">
      {/* Fixed sidebar on desktop; mobile uses the Sheet in the header. */}
      <div className="fixed inset-y-0 left-0 hidden md:block">
        <Sidebar role={user.role} shopName={settings.shopName} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <AppHeader
          user={{ name: user.name, email: user.email, role: user.role }}
          activeCashier={cashierBadge}
          shopName={settings.shopName}
        />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
