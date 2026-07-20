import {
  DashboardSquare01Icon,
  ShoppingCart01Icon,
  PackageIcon,
  Tag01Icon,
  PackageSearchIcon,
  UserMultiple02Icon,
  Analytics01Icon,
  UserSettings01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import type { Role } from "@/db/schema"

export type NavItem = {
  href: string
  label: string
  icon: IconSvgElement
  /** Minimum role required to see this item (roles are hierarchical). */
  minRole: Role
}

// Order matches the shop's daily flow: overview, sell, then manage.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon, minRole: "cashier" },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart01Icon, minRole: "cashier" },
  { href: "/products", label: "Products", icon: PackageIcon, minRole: "cashier" },
  { href: "/categories", label: "Categories", icon: Tag01Icon, minRole: "manager" },
  { href: "/inventory", label: "Inventory", icon: PackageSearchIcon, minRole: "manager" },
  { href: "/customers", label: "Customers", icon: UserMultiple02Icon, minRole: "cashier" },
  { href: "/reports", label: "Reports", icon: Analytics01Icon, minRole: "manager" },
  { href: "/users", label: "Users & Roles", icon: UserSettings01Icon, minRole: "admin" },
  { href: "/settings", label: "Settings", icon: Settings02Icon, minRole: "admin" },
]

const ROLE_RANK: Record<Role, number> = { cashier: 1, manager: 2, admin: 3 }

export function canSee(role: Role, minRole: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}
