"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useConversation } from "@elevenlabs/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mic01Icon, MicOff01Icon, Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons"

import type { Role } from "@/db/schema"
import { NAV_ITEMS, canSee } from "@/components/app/nav-items"
import { voiceSearchProducts } from "@/actions/voice"
import {
  voiceGetDashboardSummary,
  voiceGetSalesReport,
  voiceGetRecentSales,
  voiceListCategories,
  voiceFindCustomers,
  voiceGetCustomer,
  voiceGetInventoryStatus,
  voiceListUsers,
  voiceGetShopSettings,
} from "@/actions/voice-reads"
import { createCategory } from "@/actions/categories"
import { createCustomer } from "@/actions/customers"
import { adjustStock } from "@/actions/inventory"
import { createProduct, updateProductPrice, toggleProductActive } from "@/actions/products"
import { inviteUser, setRole, setPin, setUserActive } from "@/actions/users"
import { updateShopSettings, updateAppearanceSettings } from "@/actions/settings"
import {
  voiceNavigateSchema,
  voiceSalesReportSchema,
  voiceRecentSalesSchema,
  voiceSearchProductsSchema,
  voiceFindCustomersSchema,
  voiceGetCustomerSchema,
  voiceInventoryStatusSchema,
  voiceUpdateProductPriceSchema,
  voiceSetProductActiveSchema,
  voiceSetUserActiveSchema,
  voiceCreateProductSchema,
  voiceUpdateShopSettingsSchema,
  voiceUpdateAppearanceSchema,
  categorySchema,
  customerSchema,
  adjustStockSchema,
  inviteUserSchema,
  setRoleSchema,
  setPinSchema,
} from "@/lib/validations"
import type { ActionResult } from "@/lib/action-result"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TranscriptEntry = { role: "user" | "agent"; text: string }

/** Success text (or a function of the data) for a mutation; an error string otherwise. */
function describeResult<T>(res: ActionResult<T>, onSuccess: string | ((data: T) => string)): string {
  if (!res.ok) return `Error: ${res.error}`
  return typeof onSuccess === "function" ? onSuccess(res.data) : onSuccess
}

/** JSON payload for a read tool, or an error string. */
function describeRead<T>(res: ActionResult<T>): string {
  if (!res.ok) return `Error: ${res.error}`
  return JSON.stringify(res.data)
}

/**
 * The app-wide voice assistant: lives in the header so it's available on
 * every authenticated page (Dashboard, Products, Inventory, Customers,
 * Reports, Users & Roles, Settings — plus POS, which additionally registers
 * its own cart tools via <PosVoiceTools> while mounted). Every tool here
 * either reads live data through the same queries the pages themselves use,
 * or calls the exact same "use server" action a button click would — so
 * authorization (`requireRole`), validation, and business logic are 100%
 * shared with the mouse/keyboard UI, never reimplemented for voice.
 */
export function VoiceAssistant({ role }: { role: Role }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [transcript, setTranscript] = React.useState<TranscriptEntry[]>([])
  const [lastAction, setLastAction] = React.useState<string | null>(null)
  const [micError, setMicError] = React.useState<string | null>(null)
  const [connectError, setConnectError] = React.useState<string | null>(null)

  const conversation = useConversation({
    onMessage: ({ message, role: msgRole }) => {
      setTranscript((prev) => [...prev.slice(-19), { role: msgRole, text: message }])
    },
    onError: (message) => {
      setConnectError(message || "The voice assistant lost its connection.")
    },
    onDisconnect: () => {
      setLastAction(null)
    },
    clientTools: {
      navigate_to: async (parameters: Record<string, unknown>) => {
        const parsed = voiceNavigateSchema.safeParse(parameters)
        if (!parsed.success) return "That's not a page I recognize."
        const item = NAV_ITEMS.find((i) => i.href === parsed.data.page)
        if (!item || !canSee(role, item.minRole)) {
          return "You don't have access to that page."
        }
        setLastAction(`Opening ${item.label}`)
        router.push(item.href)
        return `Opened ${item.label}.`
      },

      find_products: async (parameters: Record<string, unknown>) => {
        const parsed = voiceSearchProductsSchema.safeParse(parameters)
        if (!parsed.success) return "Give a product name or keyword to search for."
        setLastAction(`Searching for "${parsed.data.query}"…`)
        const res = await voiceSearchProducts(parsed.data)
        if (!res.ok) return `Search failed: ${res.error}`
        if (res.data.length === 0) return `No in-stock products matched "${parsed.data.query}".`
        return JSON.stringify({
          matches: res.data,
          instruction:
            res.data.length > 1
              ? "More than one match — ask which one before acting on it."
              : "Single match — safe to act on without asking which one.",
        })
      },

      get_dashboard_summary: async () => {
        setLastAction("Checking the dashboard")
        return describeRead(await voiceGetDashboardSummary())
      },

      get_sales_report: async (parameters: Record<string, unknown>) => {
        const parsed = voiceSalesReportSchema.safeParse(parameters ?? {})
        if (!parsed.success) return "Give a valid number of days (1–90)."
        setLastAction("Pulling the sales report")
        return describeRead(await voiceGetSalesReport(parsed.data))
      },

      get_recent_sales: async (parameters: Record<string, unknown>) => {
        const parsed = voiceRecentSalesSchema.safeParse(parameters ?? {})
        if (!parsed.success) return "Give a valid limit (1–50)."
        setLastAction("Checking recent sales")
        return describeRead(await voiceGetRecentSales(parsed.data))
      },

      list_categories: async () => {
        setLastAction("Checking categories")
        return describeRead(await voiceListCategories())
      },

      create_category: async (parameters: Record<string, unknown>) => {
        const parsed = categorySchema.safeParse(parameters)
        if (!parsed.success) return "Give a valid category name."
        setLastAction(`Creating category "${parsed.data.name}"`)
        return describeResult(await createCategory(parsed.data), `Category "${parsed.data.name}" created.`)
      },

      find_customers: async (parameters: Record<string, unknown>) => {
        const parsed = voiceFindCustomersSchema.safeParse(parameters)
        if (!parsed.success) return "Give a name or phone number to search for."
        setLastAction(`Searching customers for "${parsed.data.query}"…`)
        const res = await voiceFindCustomers(parsed.data)
        if (!res.ok) return `Error: ${res.error}`
        if (res.data.length === 0) return `No customers matched "${parsed.data.query}".`
        return JSON.stringify({
          matches: res.data,
          instruction: res.data.length > 1 ? "More than one match — ask which one." : "Single match.",
        })
      },

      get_customer: async (parameters: Record<string, unknown>) => {
        const parsed = voiceGetCustomerSchema.safeParse(parameters)
        if (!parsed.success) return "That customer id wasn't valid."
        setLastAction("Looking up customer")
        return describeRead(await voiceGetCustomer(parsed.data))
      },

      create_customer: async (parameters: Record<string, unknown>) => {
        const parsed = customerSchema.safeParse(parameters)
        if (!parsed.success) return "Give a valid name and phone number (+2547XXXXXXXX)."
        setLastAction(`Adding customer "${parsed.data.name}"`)
        return describeResult(await createCustomer(parsed.data), `Customer "${parsed.data.name}" added.`)
      },

      get_inventory_status: async (parameters: Record<string, unknown>) => {
        const parsed = voiceInventoryStatusSchema.safeParse(parameters ?? {})
        if (!parsed.success) return "Invalid request."
        setLastAction("Checking stock levels")
        return describeRead(await voiceGetInventoryStatus(parsed.data))
      },

      adjust_inventory: async (parameters: Record<string, unknown>) => {
        const parsed = adjustStockSchema.safeParse(parameters)
        if (!parsed.success) return "That stock adjustment wasn't valid — check the product id, type, and quantity."
        setLastAction(`Adjusting stock (${parsed.data.type})`)
        return describeResult(
          await adjustStock(parsed.data),
          (data) => `Stock updated. On hand is now ${data.quantityOnHand}.`
        )
      },

      create_product: async (parameters: Record<string, unknown>) => {
        const parsed = voiceCreateProductSchema.safeParse(parameters)
        if (!parsed.success) return "That product wasn't valid — check the name, SKU, category id, and price."
        setLastAction(`Creating product "${parsed.data.name}"`)
        return describeResult(
          await createProduct({ ...parsed.data, isActive: true }),
          `Product "${parsed.data.name}" created.`
        )
      },

      set_product_price: async (parameters: Record<string, unknown>) => {
        const parsed = voiceUpdateProductPriceSchema.safeParse(parameters)
        if (!parsed.success) return "Give a valid product id and price."
        setLastAction("Updating price")
        return describeResult(await updateProductPrice(parsed.data.productId, parsed.data.price), "Price updated.")
      },

      set_product_active: async (parameters: Record<string, unknown>) => {
        const parsed = voiceSetProductActiveSchema.safeParse(parameters)
        if (!parsed.success) return "Give a product id and whether it should be active."
        setLastAction(parsed.data.isActive ? "Reactivating product" : "Deactivating product")
        return describeResult(
          await toggleProductActive(parsed.data.productId, parsed.data.isActive),
          parsed.data.isActive ? "Product reactivated." : "Product deactivated."
        )
      },

      list_users: async () => {
        setLastAction("Checking staff list")
        return describeRead(await voiceListUsers())
      },

      invite_staff: async (parameters: Record<string, unknown>) => {
        const parsed = inviteUserSchema.safeParse(parameters)
        if (!parsed.success) return "Give a valid name, email, and role (admin, manager, or cashier)."
        setLastAction(`Inviting ${parsed.data.name}`)
        return describeResult(await inviteUser(parsed.data), `Invited ${parsed.data.name} as ${parsed.data.role}.`)
      },

      set_staff_role: async (parameters: Record<string, unknown>) => {
        const parsed = setRoleSchema.safeParse(parameters)
        if (!parsed.success) return "Give a valid staff id and role."
        setLastAction(`Setting role to ${parsed.data.role}`)
        return describeResult(await setRole(parsed.data), `Role updated to ${parsed.data.role}.`)
      },

      // PIN is sensitive: warn against reading it back where a customer could overhear.
      set_staff_pin: async (parameters: Record<string, unknown>) => {
        const parsed = setPinSchema.safeParse(parameters)
        if (!parsed.success) return "PINs must be 4–6 digits."
        setLastAction("Updating staff PIN")
        return describeResult(await setPin(parsed.data), "PIN updated. Don't repeat it out loud.")
      },

      set_staff_active: async (parameters: Record<string, unknown>) => {
        const parsed = voiceSetUserActiveSchema.safeParse(parameters)
        if (!parsed.success) return "Give a valid staff id and active state."
        setLastAction(parsed.data.isActive ? "Reactivating staff account" : "Deactivating staff account")
        return describeResult(
          await setUserActive(parsed.data.userId, parsed.data.isActive),
          parsed.data.isActive ? "Account reactivated." : "Account deactivated."
        )
      },

      get_shop_settings: async () => {
        setLastAction("Checking shop settings")
        return describeRead(await voiceGetShopSettings())
      },

      update_shop_settings: async (parameters: Record<string, unknown>) => {
        const parsed = voiceUpdateShopSettingsSchema.safeParse(parameters)
        if (!parsed.success) return "That settings update wasn't valid."
        const current = await voiceGetShopSettings()
        if (!current.ok) return `Error: ${current.error}`
        setLastAction("Updating shop settings")
        return describeResult(
          await updateShopSettings({
            shopName: parsed.data.shopName ?? current.data.shopName,
            shopAddress: parsed.data.shopAddress ?? current.data.shopAddress ?? "",
            shopPhone: parsed.data.shopPhone ?? current.data.shopPhone ?? "",
            shopEmail: parsed.data.shopEmail ?? current.data.shopEmail ?? "",
            currency: parsed.data.currency ?? current.data.currency,
            defaultTaxRate: parsed.data.defaultTaxRate ?? current.data.defaultTaxRate,
            receiptFooterNote: parsed.data.receiptFooterNote ?? current.data.receiptFooterNote ?? "",
            lowStockThresholdDefault:
              parsed.data.lowStockThresholdDefault ?? current.data.lowStockThresholdDefault,
          }),
          "Shop settings updated."
        )
      },

      update_appearance: async (parameters: Record<string, unknown>) => {
        const parsed = voiceUpdateAppearanceSchema.safeParse(parameters)
        if (!parsed.success) return "That appearance update wasn't valid."
        const current = await voiceGetShopSettings()
        if (!current.ok) return `Error: ${current.error}`
        setLastAction("Updating appearance")
        return describeResult(
          await updateAppearanceSettings({
            themeMode: parsed.data.themeMode ?? current.data.themeMode,
            accentIntensity: parsed.data.accentIntensity ?? current.data.accentIntensity,
            density: parsed.data.density ?? current.data.density,
          }),
          "Appearance updated."
        )
      },
    },
  })

  async function handleStart() {
    setMicError(null)
    setConnectError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setMicError(
        "Microphone access was denied. Allow microphone access in your browser to use voice, or keep using touch/mouse."
      )
      setOpen(true)
      return
    }

    setOpen(true)
    try {
      const res = await fetch("/api/voice/signed-url")
      const data = (await res.json()) as { signedUrl?: string; error?: string }
      if (!res.ok || !data.signedUrl) {
        setConnectError(data.error ?? "Couldn't start the voice assistant.")
        return
      }
      setTranscript([])
      await conversation.startSession({ signedUrl: data.signedUrl })
    } catch {
      setConnectError("Network error reaching the voice service.")
    }
  }

  async function handleEnd() {
    await conversation.endSession()
    setOpen(false)
  }

  const status = conversation.status
  const isLive = status === "connected"

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={isLive ? "default" : "outline"}
          size="sm"
          className={cn(isLive && conversation.isListening && "animate-pulse")}
          onClick={() => (isLive ? setOpen((o) => !o) : void handleStart())}
          aria-label="Voice assistant"
        >
          <HugeiconsIcon icon={isLive ? Mic01Icon : MicOff01Icon} />
          {isLive ? (conversation.isSpeaking ? "Speaking…" : "Listening…") : "Voice"}
        </Button>
        {isLive && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => void handleEnd()}
            aria-label="End voice session"
            title="End voice session"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </Button>
        )}
      </div>

      {/* A plain floating panel, not a modal Sheet — no overlay/blur/focus-trap,
          so the cashier can keep looking at and using the screen underneath
          while the assistant is transcribing or navigating for them. */}
      {open && (
        <div className="fixed top-16 right-4 z-40 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg sm:right-6">
          <div className="flex items-start justify-between gap-2 border-b border-border p-4">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Voice assistant</p>
              <p className="text-xs text-muted-foreground">
                {status === "connecting" && "Connecting…"}
                {status === "connected" && (conversation.isSpeaking ? "Speaking…" : "Listening…")}
                {status === "disconnected" && "Not connected"}
                {status === "error" && "Connection error"}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close panel">
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {(micError || connectError) && (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <HugeiconsIcon icon={Alert02Icon} size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p>{micError ?? connectError}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can keep using the screen and buttons as normal.
                  </p>
                </div>
              </div>
            )}

            {lastAction && isLive && (
              <Badge variant="outline" className="mb-3">
                {lastAction}
              </Badge>
            )}

            <ul className="space-y-2 text-sm">
              {transcript.map((t, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-md px-3 py-2",
                    t.role === "user" ? "ml-6 bg-primary/10 text-foreground" : "mr-6 bg-muted text-foreground"
                  )}
                >
                  <span className="mb-0.5 block text-xs font-medium text-muted-foreground">
                    {t.role === "user" ? "You" : "Assistant"}
                  </span>
                  {t.text}
                </li>
              ))}
            </ul>

            {transcript.length === 0 && !micError && !connectError && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Try: &ldquo;What&apos;s today&apos;s revenue?&rdquo; or &ldquo;Open inventory&rdquo;
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            {isLive ? (
              <Button variant="outline" className="w-full" onClick={() => void handleEnd()}>
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
                End voice session
              </Button>
            ) : (
              <Button className="w-full" onClick={() => void handleStart()}>
                <HugeiconsIcon icon={Mic01Icon} size={16} />
                Start voice session
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
