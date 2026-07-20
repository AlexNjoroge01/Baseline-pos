import { drizzle } from "drizzle-orm/neon-serverless"
import { neonConfig, Pool } from "@neondatabase/serverless"
import ws from "ws"

import * as schema from "./schema"

// The neon-serverless driver needs a WebSocket implementation in Node runtimes.
// (In edge/serverless environments a global WebSocket already exists.)
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws
}

const connectionString = process.env.DATABASE_URL

if (!connectionString && process.env.NODE_ENV !== "production") {
  // Warn (don't throw) so `next build` and tooling can import this module without
  // a live DB. Queries will fail with a clear error at request time if it's still unset.
  console.warn("[db] DATABASE_URL is not set. Copy .env.example to .env and fill it in.")
}

// A single pooled client is reused across hot reloads in development.
const globalForDb = globalThis as unknown as { __dukaPool?: Pool }

const pool =
  globalForDb.__dukaPool ??
  new Pool({ connectionString: connectionString || "postgresql://user:pass@localhost:5432/duka" })
if (process.env.NODE_ENV !== "production") {
  globalForDb.__dukaPool = pool
}

export const db = drizzle(pool, { schema })

export type Database = typeof db
export { schema }
