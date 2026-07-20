/**
 * Regenerate the product image SVGs in public/seed-products/ from db/catalog.ts,
 * without touching the database. Safe to run any time:  pnpm db:images
 *
 * The seeded products' imageUrl already points at these files, so refreshing the
 * art here updates the POS, product table and receipts previews immediately.
 */
import { generateProductImages } from "./catalog"

const count = generateProductImages()
console.log(`🖼️  Wrote ${count} product images to public/seed-products/`)
