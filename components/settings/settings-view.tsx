"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateShopSettings, updateAppearanceSettings } from "@/actions/settings"
import type { Settings } from "@/db/schema"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsView({ settings }: { settings: Settings }) {
  return (
    <Tabs defaultValue="shop">
      <TabsList className="mb-6">
        <TabsTrigger value="shop">Shop profile</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>
      <TabsContent value="shop">
        <ShopForm settings={settings} />
      </TabsContent>
      <TabsContent value="appearance">
        <AppearanceForm settings={settings} />
      </TabsContent>
    </Tabs>
  )
}

function ShopForm({ settings }: { settings: Settings }) {
  const [form, setForm] = React.useState({
    shopName: settings.shopName,
    shopAddress: settings.shopAddress ?? "",
    shopPhone: settings.shopPhone ?? "",
    shopEmail: settings.shopEmail ?? "",
    currency: settings.currency,
    defaultTaxRate: settings.defaultTaxRate,
    receiptFooterNote: settings.receiptFooterNote ?? "",
    lowStockThresholdDefault: String(settings.lowStockThresholdDefault),
  })
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const [isPending, startTransition] = React.useTransition()

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    startTransition(async () => {
      const res = await updateShopSettings({
        ...form,
        lowStockThresholdDefault: Number(form.lowStockThresholdDefault),
      })
      if (res.ok) toast.success("Shop settings saved")
      else {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display">Shop profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Shop name" error={errors.shopName}>
            <Input value={form.shopName} onChange={(e) => set("shopName", e.target.value)} />
          </Field>
          <Field label="Address" error={errors.shopAddress}>
            <Textarea value={form.shopAddress} onChange={(e) => set("shopAddress", e.target.value)} rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" error={errors.shopPhone}>
              <Input value={form.shopPhone} onChange={(e) => set("shopPhone", e.target.value)} />
            </Field>
            <Field label="Email" error={errors.shopEmail}>
              <Input type="email" value={form.shopEmail} onChange={(e) => set("shopEmail", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Currency" error={errors.currency}>
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </Field>
            <Field label="Default tax %" error={errors.defaultTaxRate}>
              <Input value={form.defaultTaxRate} onChange={(e) => set("defaultTaxRate", e.target.value)} />
            </Field>
            <Field label="Low-stock default" error={errors.lowStockThresholdDefault}>
              <Input
                type="number"
                value={form.lowStockThresholdDefault}
                onChange={(e) => set("lowStockThresholdDefault", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Receipt footer note" error={errors.receiptFooterNote}>
            <Input
              value={form.receiptFooterNote}
              onChange={(e) => set("receiptFooterNote", e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const THEME_MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const
const ACCENTS = [
  { value: "soft", label: "Soft", color: "var(--blue-500)" },
  { value: "standard", label: "Standard", color: "var(--blue-600)" },
  { value: "bold", label: "Bold", color: "var(--blue-700)" },
] as const
const DENSITIES = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
] as const

function AppearanceForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [themeMode, setThemeMode] = React.useState<string>(settings.themeMode)
  const [accentIntensity, setAccent] = React.useState<string>(settings.accentIntensity)
  const [density, setDensity] = React.useState<string>(settings.density)
  const [isPending, startTransition] = React.useTransition()

  function save() {
    startTransition(async () => {
      const res = await updateAppearanceSettings({ themeMode, accentIntensity, density })
      if (res.ok) {
        toast.success("Appearance updated")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <Label className="mb-3 block">Theme mode</Label>
          <div className="grid grid-cols-3 gap-3">
            {THEME_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setThemeMode(m.value)}
                className={cn(
                  "rounded-lg border-2 p-3 text-left transition-colors",
                  themeMode === m.value ? "border-primary" : "border-border hover:border-slate-300"
                )}
              >
                <div className="mb-2 flex gap-1">
                  <span
                    className="h-8 flex-1 rounded"
                    style={{
                      background:
                        m.value === "dark"
                          ? "var(--slate-900)"
                          : m.value === "light"
                            ? "#fff"
                            : "linear-gradient(90deg,#fff 50%,var(--slate-900) 50%)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Accent intensity</Label>
          <div className="grid grid-cols-3 gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAccent(a.value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-2 p-3 transition-colors",
                  accentIntensity === a.value ? "border-primary" : "border-border hover:border-slate-300"
                )}
              >
                <span className="size-6 rounded-full" style={{ background: a.color }} />
                <span className="text-sm font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Density</Label>
          <div className="grid grid-cols-2 gap-3">
            {DENSITIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDensity(d.value)}
                className={cn(
                  "rounded-lg border-2 p-3 text-left transition-colors",
                  density === d.value ? "border-primary" : "border-border hover:border-slate-300"
                )}
              >
                <span className="text-sm font-medium">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={isPending}>
          {isPending ? "Applying…" : "Apply appearance"}
        </Button>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  )
}
