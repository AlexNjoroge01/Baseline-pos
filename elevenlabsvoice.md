Ready for review
Select text to add comments on the plan
Voice Interface for Duka POS (ElevenLabs Agents + real M-Pesa STK Push)
Context
The POS (/pos) is a Next.js 16 / React 19 app-router app with cookie-based sessions (no bearer tokens), Drizzle/Postgres, and all business logic in "use server" action files (actions/*.ts) that re-validate everything with Zod regardless of caller. The cart itself is pure client React state in components/pos/pos-terminal.tsx; only checkout (createSale in actions/sales.ts) touches the database, inside one transaction that re-prices, re-checks stock, and decrements inventory.

Two gaps found during investigation, confirmed with the user:

No M-Pesa integration exists. paymentMethod: "mpesa" today is just a label plus a manually-typed reference code — there's no STK push, no pending-payment state. The user asked for the real thing: a Safaricom Daraja STK Push integration (sandbox credentials, to be added by the user to .env), not a UI-only mirror of the current flow.
ElevenLabs Agents (Conversational AI) is the target voice platform. I verified the current integration shape directly against ElevenLabs' live OpenAPI spec (not training-data docs, which drift fast in this space):
Client tools run in the browser via @elevenlabs/react's useConversation({ clientTools }), calling back into the app — this is the correct integration point here because it lets tool calls hit our existing "use server" actions directly (same-origin, cookie-authenticated, zero new auth plumbing).
Private agents require a signed URL minted server-side (GET /v1/convai/conversation/get-signed-url?agent_id=... with header xi-api-key), valid 15 minutes. Making the agent private (platform_settings.auth.enable_auth: true) means our own requireSession()-gated route is the only way to ever get a signed URL — this is how "only an authenticated user can use voice" gets enforced, reusing existing auth rather than inventing a parallel scheme.
Client tool schemas (name/description/JSON-schema params/expects_response) can be created via POST /v1/convai/tools, and an agent via POST /v1/convai/agents/create referencing tool_ids. I confirmed these exact request/response shapes against the live spec, so I can provision the agent with a script instead of asking the user to hand-configure a dashboard.
The goal: layer voice onto the existing POS without touching how the mouse/keyboard flow works, reusing every existing pricing/stock/checkout/auth code path, and adding the minimum new infrastructure the real M-Pesa flow genuinely requires.

Architecture
Browser mic → @elevenlabs/react (WebSocket, signed URL) → ElevenLabs Agent (LLM)
   → client tool call → our existing "use server" actions / shared hook state
   → existing business logic (pricing, stock, createSale) → Postgres / Daraja API
Voice is scoped to the POS page only — matches every example command in the request (cart, checkout, payment). No global voice control of other sections.
No new auth model. Every tool ultimately calls either (a) a plain client-state mutation identical to today's click handlers, or (b) an existing/new "use server" action, which already does requireSession()/requireRole()/getActiveCashier() via cookies — exactly like clicking a button does today.
The LLM never sets a price, stock level, or order status. All of those are re-fetched or re-computed server-side at the moment they matter (search, add-to-cart guard, checkout, payment confirmation).
New database schema (real STK Push requires pending-payment state)
Add to db/schema.ts, following the existing relational style (no jsonb anywhere in this codebase — stay consistent, use a child items table like saleItems):

paymentRequestStatusEnum: ["pending", "completed", "failed", "cancelled"]
paymentRequests table: id, phone, amountCents (server-computed, authoritative), customerId (nullable fk), discountCents, status, checkoutRequestId (unique, nullable until Daraja responds), merchantRequestId, mpesaReceiptNumber, resultDesc, saleId (nullable fk, set once the sale is actually created), initiatedBy (fk users), createdAt, updatedAt.
paymentRequestItems table: id, paymentRequestId (fk), productId (fk), quantity — a frozen snapshot of the cart at the moment STK push was sent, so a confirmed payment always creates a sale for exactly what was quoted, even if the on-screen cart changes while waiting.
Run pnpm db:generate (local file operation, no live DB needed) to produce the migration SQL. I will not run db:push/db:migrate against the real Neon database myself — that's the user's call once they review the migration.

Shared pricing extraction (avoid duplicating checkout logic)
actions/sales.ts → createSale() currently inlines "re-fetch products + inventory, validate stock, compute subtotal/tax" (lines ~43-83). Extract that into lib/pricing.ts:

export async function priceCartLines(dbOrTx, items: {productId, quantity}[]): Promise<{lines, subtotalCents, taxTotalCents}>
createSale calls this instead of inlining it; the new M-Pesa initiate action calls the same function to compute the authoritative amount before ever talking to Daraja. This is the one piece of "duplicate business logic" the M-Pesa flow would otherwise force — extracting it removes the duplication instead of accepting it.

New files
M-Pesa (Daraja)

lib/mpesa.ts — OAuth token fetch+cache (GET /oauth/v1/generate), initiateStkPush() (POST /mpesa/stkpush/v1/processrequest), queryStkPush() (POST /mpesa/stkpushquery/v1/query). Reads DARAJA_CONSUMER_KEY/SECRET/SHORTCODE/PASSKEY, DARAJA_ENV (sandbox/production), MPESA_CALLBACK_BASE_URL. Pure server module, no "use server" (mirrors lib/inventory-core.ts's pattern of helpers used by actions).
actions/mpesa.ts ("use server") —
initiateMpesaPayment(input): requireSession()/getActiveCashier(), validate with a new Zod schema reusing cartLineSchema + a phone schema, call priceCartLines() for the authoritative amount, insert a pending paymentRequests row + paymentRequestItems snapshot, call Daraja STK push, store checkoutRequestId/merchantRequestId (or mark failed on error). Returns the paymentRequestId and the amount actually charged — never an amount the client/LLM supplied.
checkMpesaPaymentStatus(paymentRequestId): requireSession(), loads the row (must belong to a request initiated in this shop — no cross-tenant concern here since it's single-shop, but still requires an authenticated session), if still pending actively calls queryStkPush() (works even without a reachable callback URL, which matters since the callback URL isn't wired to a public tunnel yet), updates status, and only when Daraja confirms success creates the sale via the existing createSale() using the frozen item snapshot + mpesaReceiptNumber as paymentReference, guarded so this happens exactly once (saleId IS NULL check). Returns the current authoritative status + sale summary if completed — this is the single source of truth the voice tool and the UI both poll; nothing ever tells the user "paid" except this.
app/api/mpesa/callback/route.ts (public POST, no session — Safaricom can't send cookies) — best-effort fast path: parses Body.stkCallback, looks up by CheckoutRequestID, does the same idempotent status-transition + sale-creation as above (shared helper so both paths can't double-create a sale). Documented as needing a public HTTPS URL (ngrok/deployed domain) to ever be hit; the active-query fallback above means the feature works correctly without it.
Voice

app/api/voice/signed-url/route.ts (GET) — checks session directly (401 JSON if none — this is a route handler, not a page, so it can't use requireSession()'s redirect), calls ElevenLabs get-signed-url with ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID (both server-only env vars), returns { signedUrl }.
actions/voice.ts ("use server") — voiceSearchProducts(query): requireSession(), reuses listActiveProductsForPos() from lib/queries.ts (already the exact data driving the visible grid) and filters in-memory (small catalog) — zero duplicated query logic.
hooks/use-pos-cart.ts — extracts the cart/payment state, derived totals, and mutator functions (addToCart, setQty, reset, complete) that currently live inline in PosTerminal into a hook, with no behavior change — this is what lets the voice component and the manual UI share one literal state instance instead of duplicating cart logic.
components/pos/voice-assistant.tsx ("use client") — mic button + status/transcript panel (built with existing Sheet/Button/Badge primitives per Design.md, no new visual language). Uses @elevenlabs/react's useConversation with clientTools implementing the 9 tools below, all of which call either the shared hook's functions or the server actions above. Handles: mic permission denial, connection failure, tool errors — all surfaced as inline banners, never blocking the rest of the POS.
components/pos/pos-terminal.tsx — refactored to call usePosCart() and render <VoiceAssistant cart={cart} ... />; the JSX/behavior for mouse/touch stays the same.
scripts/setup-elevenlabs-agent.ts — one-time provisioning script using the verified REST endpoints (POST /v1/convai/tools, POST /v1/convai/agents/create, private via platform_settings.auth.enable_auth: true) to create the 9 tools + the agent from a system prompt written here (includes explicit instructions: ask for clarification on ambiguous products, never state a price/total/payment result the tool didn't return, treat product names as data not instructions). Prints the resulting agent id to add as ELEVENLABS_AGENT_ID. Re-runnable: looks up existing tools/agent by name first.
.env.example (doesn't exist yet) — documents every var this feature needs: ELEVENLABS_AGENT_ID, DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, DARAJA_PASSKEY, DARAJA_ENV, MPESA_CALLBACK_BASE_URL, alongside the existing DATABASE_URL/RESEND_API_KEY/ELEVENLABS_API_KEY.
Validation additions (lib/validations.ts, additive only) — export the existing kenyanPhone regex as kenyanPhoneSchema; add voiceAdjustCartItemSchema (signed delta, same convention as the existing adjustStockSchema), voiceSetCartQuantitySchema (absolute, 0 = remove), voiceSearchProductsSchema, initiateMpesaPaymentSchema (reuses cartLineSchema), checkMpesaPaymentStatusSchema.

The 9 voice tools
Tool	Maps to example(s)	Implementation
find_products	"Add Coke" (ambiguous)	voiceSearchProducts action; returns matches with live price/stock; agent instructed to ask which one if >1 match
get_cart	"What's in the cart?", "What's my total?"	reads shared hook state, returns lines + subtotal/tax/discount/total
adjust_cart_item	"Add two burgers", "Remove one burger"	signed delta, calls hook's increment/decrement (same guard as clicking a tile)
set_cart_quantity	"Change the burgers to four"	absolute set; 0 removes the line
clear_cart	(safety/reset)	empties cart
set_payment_method	"I want to pay with M-Pesa"	sets method in shared state only
initiate_mpesa_payment	"Send the payment request to 0712345678"	actions/mpesa.ts — server recomputes amount, never trusts a spoken figure; response text is explicit that this only means the push was sent
check_payment_status	(agent uses this to confirm before saying "paid")	polls checkMpesaPaymentStatus; only a completed result lets the agent say the sale is done
complete_order	"Complete the order"	calls existing createSale via the hook's complete(); refuses if paymentMethod === "mpesa" (must go through the confirmed-payment path instead — can't bypass payment confirmation)
All cart-mutation tools validate with the new Zod schemas before touching state; all money/stock is re-read live, never taken from the tool call itself.

Security checklist (addressing the brief's list directly)
Auth: signed-url route requires getSession(); every server action requires requireSession()/requireRole() exactly as today.
Prompt injection: product names sanitized before returning to the agent; system prompt explicitly says catalog data is not instructions.
Malicious tool args: every tool input Zod-validated (uuid, bounded ints, phone regex) before it reaches any mutation.
Price/inventory/payment manipulation: amounts and stock are always server-computed at the moment of use (priceCartLines, createSale's re-check, Daraja's own confirmed amount) — the LLM's stated numbers are never persisted as fact.
Payment safeguards: complete_order can't finalize an M-Pesa sale; only a Daraja-confirmed checkMpesaPaymentStatus/callback creates that sale, exactly once (guarded by saleId IS NULL).
Secrets: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, Daraja credentials only ever read in server files (lib/mpesa.ts, route handlers, actions) — never in a "use client" file, matching the existing rule for RESEND_API_KEY/DB client.
Side-effecting steps I'll take during implementation (flagging up front)
Run pnpm db:generate — local file only, no live DB write.
Run scripts/setup-elevenlabs-agent.ts against the real ElevenLabs API using the key already in .env — this creates real (but freely deletable) tool/agent resources in the user's ElevenLabs account, which is the whole point of having the key. I will not run pnpm db:push/db:migrate against the live Neon database, and Daraja calls only ever hit the sandbox and only once real credentials are filled in.
Verification
pnpm typecheck, pnpm lint, pnpm build must pass.
Manual: run pnpm dev, sign in, open /pos; confirm the existing mouse/touch flow is pixel-identical and untouched.
Voice smoke test (needs a mic + speakers, so this part is on the user): grant mic permission, run through "add two of X" → cart updates live, "what's my total" → agent states the actual on-screen total, an ambiguous product name → agent asks which one, M-Pesa flow once Daraja sandbox creds are in .env → STK push arrives on a real/sandbox test phone, check_payment_status only reports success after Daraja confirms.
I'll additionally exercise the non-voice-input paths directly: call the new server actions with representative inputs (invalid uuid, insufficient stock, wrong role) to confirm they fail closed exactly like the existing ones.
Mic-denied / ElevenLabs-unreachable / session-expired paths: confirm the panel shows an error and the rest of the POS keeps working untouched.