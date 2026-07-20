"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Store04Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import type { Role } from "@/db/schema"
import { NAV_ITEMS, canSee } from "@/components/app/nav-items"

export function Sidebar({
  role,
  shopName,
  className,
  onNavigate,
}: {
  role: Role
  shopName: string
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((i) => canSee(role, i.minRole))

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-active-rule/20 text-sidebar-foreground">
          <HugeiconsIcon icon={Store04Icon} size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">{shopName}</p>
          <p className="text-xs text-sidebar-muted">Duka POS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-md py-2 pr-3 pl-3 text-sm transition-colors",
                // The Ledger Rule: active item marked by a 2px left rule, not a filled pill.
                active
                  ? "ledger-rule-active bg-white/5 pl-[10px] font-medium text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={19}
                className={cn(active ? "text-sidebar-foreground" : "text-sidebar-muted")}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-sidebar-muted">
        <span className="font-figures">v0.1</span> · The Ledger
      </div>
    </aside>
  )
}
