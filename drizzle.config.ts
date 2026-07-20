import { defineConfig } from "drizzle-kit"

// Migrations run against the DIRECT (unpooled) connection; the app itself uses
// the pooled DATABASE_URL at runtime (see db/index.ts).
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
})
