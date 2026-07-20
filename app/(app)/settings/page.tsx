import { requireRole } from "@/lib/auth-session"
import { getSettings } from "@/lib/settings"
import { PageHeader } from "@/components/app/page-header"
import { SettingsView } from "@/components/settings/settings-view"

export default async function SettingsPage() {
  await requireRole("admin")
  const settings = await getSettings()

  return (
    <div>
      <PageHeader title="Settings" description="Shop profile, receipts and appearance." />
      <SettingsView settings={settings} />
    </div>
  )
}
