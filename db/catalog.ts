/**
 * Shared seed catalogue — categories + products, plus the (offline) product-image
 * generator. Imported by both `db/seed.ts` and `db/generate-product-images.ts`
 * so the data and the generated SVGs never drift apart.
 *
 * Images are self-contained SVGs (a category-tinted card + a representative emoji)
 * written to public/seed-products/<SKU>.svg — no network, no storage service.
 */
import { mkdirSync, writeFileSync } from "fs"
import { join } from "path"

import type { Unit } from "./schema"

export type SeedCategory = { name: string; slug: string; description: string; color: string }

export const CATEGORY_DATA: SeedCategory[] = [
  { name: "Grains & Flour", slug: "grains-flour", description: "Maize, rice, wheat and flours", color: "#1652D6" },
  { name: "Cooking Essentials", slug: "cooking-essentials", description: "Oils, salt, sugar and spices", color: "#12805C" },
  { name: "Beverages", slug: "beverages", description: "Tea, coffee, sodas and juices", color: "#B4790A" },
  { name: "Dairy & Bread", slug: "dairy-bread", description: "Milk, eggs, bread and butter", color: "#5C8FF0" },
  { name: "Household & Cleaning", slug: "household-cleaning", description: "Soap, detergent and cleaning", color: "#123FA8" },
  { name: "Personal Care", slug: "personal-care", description: "Toothpaste, lotion and hygiene", color: "#8FB4F7" },
  { name: "Snacks & Confectionery", slug: "snacks-confectionery", description: "Biscuits, sweets and crisps", color: "#C4362E" },
]

export type SeedProduct = {
  name: string
  sku: string
  category: string
  unit: Unit
  priceCents: number
  costCents: number
  reorder: number
  stock: number
  emoji: string
}

export const PRODUCT_DATA: SeedProduct[] = [
  // Grains & Flour
  { name: "Pembe Maize Flour 2kg", sku: "GRN-001", category: "grains-flour", unit: "pack", priceCents: 16500, costCents: 14000, reorder: 10, stock: 40, emoji: "🌽" },
  { name: "Jogoo Maize Flour 2kg", sku: "GRN-002", category: "grains-flour", unit: "pack", priceCents: 17000, costCents: 14500, reorder: 10, stock: 8, emoji: "🌽" },
  { name: "Pishori Rice 1kg", sku: "GRN-003", category: "grains-flour", unit: "kg", priceCents: 21000, costCents: 18000, reorder: 8, stock: 25, emoji: "🍚" },
  { name: "Ndovu Wheat Flour 2kg", sku: "GRN-004", category: "grains-flour", unit: "pack", priceCents: 19000, costCents: 16000, reorder: 8, stock: 18, emoji: "🌾" },
  { name: "Green Grams (Ndengu) 1kg", sku: "GRN-005", category: "grains-flour", unit: "kg", priceCents: 24000, costCents: 20000, reorder: 5, stock: 12, emoji: "🫘" },

  // Cooking Essentials
  { name: "Fresh Fri Cooking Oil 1L", sku: "COK-001", category: "cooking-essentials", unit: "litre", priceCents: 32000, costCents: 28000, reorder: 8, stock: 30, emoji: "🛢️" },
  { name: "Kimbo Cooking Fat 1kg", sku: "COK-002", category: "cooking-essentials", unit: "kg", priceCents: 30000, costCents: 26000, reorder: 6, stock: 15, emoji: "🧈" },
  { name: "Kensalt Table Salt 500g", sku: "COK-003", category: "cooking-essentials", unit: "pack", priceCents: 3500, costCents: 2500, reorder: 15, stock: 60, emoji: "🧂" },
  { name: "Kabras Sugar 2kg", sku: "COK-004", category: "cooking-essentials", unit: "pack", priceCents: 26000, costCents: 23000, reorder: 10, stock: 4, emoji: "🍬" },
  { name: "Royco Beef Cubes 8s", sku: "COK-005", category: "cooking-essentials", unit: "pack", priceCents: 5000, costCents: 4000, reorder: 12, stock: 45, emoji: "🍲" },

  // Beverages
  { name: "Kericho Gold Tea 100 bags", sku: "BEV-001", category: "beverages", unit: "pack", priceCents: 38000, costCents: 33000, reorder: 6, stock: 20, emoji: "🍵" },
  { name: "Nescafe Classic 50g", sku: "BEV-002", category: "beverages", unit: "piece", priceCents: 34000, costCents: 30000, reorder: 5, stock: 14, emoji: "☕" },
  { name: "Coca-Cola 500ml", sku: "BEV-003", category: "beverages", unit: "piece", priceCents: 6000, costCents: 4500, reorder: 24, stock: 96, emoji: "🥤" },
  { name: "Minute Maid Juice 1L", sku: "BEV-004", category: "beverages", unit: "litre", priceCents: 15000, costCents: 12000, reorder: 8, stock: 22, emoji: "🧃" },
  { name: "Dasani Water 1L", sku: "BEV-005", category: "beverages", unit: "litre", priceCents: 5000, costCents: 3500, reorder: 20, stock: 80, emoji: "💧" },

  // Dairy & Bread
  { name: "Brookside Milk 500ml", sku: "DRY-001", category: "dairy-bread", unit: "piece", priceCents: 5500, costCents: 4500, reorder: 20, stock: 50, emoji: "🥛" },
  { name: "Festive White Bread 400g", sku: "DRY-002", category: "dairy-bread", unit: "piece", priceCents: 6500, costCents: 5200, reorder: 15, stock: 35, emoji: "🍞" },
  { name: "Eggs (Tray of 30)", sku: "DRY-003", category: "dairy-bread", unit: "pack", priceCents: 45000, costCents: 40000, reorder: 6, stock: 10, emoji: "🥚" },
  { name: "Blue Band Margarine 250g", sku: "DRY-004", category: "dairy-bread", unit: "piece", priceCents: 18000, costCents: 15000, reorder: 8, stock: 3, emoji: "🧈" },

  // Household & Cleaning
  { name: "Omo Washing Powder 1kg", sku: "HSE-001", category: "household-cleaning", unit: "pack", priceCents: 28000, costCents: 24000, reorder: 8, stock: 26, emoji: "🧺" },
  { name: "Sunlight Bar Soap 800g", sku: "HSE-002", category: "household-cleaning", unit: "piece", priceCents: 22000, costCents: 18000, reorder: 10, stock: 30, emoji: "🧼" },
  { name: "Harpic Toilet Cleaner 500ml", sku: "HSE-003", category: "household-cleaning", unit: "piece", priceCents: 24000, costCents: 20000, reorder: 6, stock: 16, emoji: "🚽" },
  { name: "Jik Bleach 750ml", sku: "HSE-004", category: "household-cleaning", unit: "piece", priceCents: 15000, costCents: 12000, reorder: 8, stock: 20, emoji: "🧪" },

  // Personal Care
  { name: "Colgate Toothpaste 140g", sku: "PER-001", category: "personal-care", unit: "piece", priceCents: 16000, costCents: 13000, reorder: 10, stock: 28, emoji: "🪥" },
  { name: "Geisha Soap 125g", sku: "PER-002", category: "personal-care", unit: "piece", priceCents: 8000, costCents: 6000, reorder: 15, stock: 40, emoji: "🛁" },
  { name: "Nivea Body Lotion 400ml", sku: "PER-003", category: "personal-care", unit: "piece", priceCents: 55000, costCents: 48000, reorder: 5, stock: 9, emoji: "🧴" },

  // Snacks & Confectionery
  { name: "Britania Marie Biscuits", sku: "SNK-001", category: "snacks-confectionery", unit: "pack", priceCents: 5000, costCents: 3800, reorder: 20, stock: 60, emoji: "🍪" },
  { name: "Tropical Heat Crisps 100g", sku: "SNK-002", category: "snacks-confectionery", unit: "pack", priceCents: 8000, costCents: 6000, reorder: 15, stock: 45, emoji: "🍟" },
  { name: "Cadbury Dairy Milk 90g", sku: "SNK-003", category: "snacks-confectionery", unit: "piece", priceCents: 25000, costCents: 21000, reorder: 8, stock: 18, emoji: "🍫" },
]

/** A tinted card with the product's emoji centred — a lightweight "product photo". */
export function productImageSvg(emoji: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" fill="url(#g)"/>
  <circle cx="160" cy="160" r="96" fill="#ffffff" opacity="0.7"/>
  <circle cx="160" cy="160" r="96" fill="none" stroke="${color}" stroke-opacity="0.2"/>
  <text x="160" y="160" font-size="120" text-anchor="middle" dominant-baseline="central"
    font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${emoji}</text>
</svg>`
}

/** Writes every product's SVG into public/seed-products/. Returns the count. */
export function generateProductImages(publicDir?: string): number {
  const dir = publicDir ?? join(process.cwd(), "public", "seed-products")
  mkdirSync(dir, { recursive: true })
  const colorBySlug = new Map(CATEGORY_DATA.map((c) => [c.slug, c.color]))
  let count = 0
  for (const p of PRODUCT_DATA) {
    const color = colorBySlug.get(p.category) ?? "#1652D6"
    writeFileSync(join(dir, `${p.sku}.svg`), productImageSvg(p.emoji, color), "utf8")
    count++
  }
  return count
}
