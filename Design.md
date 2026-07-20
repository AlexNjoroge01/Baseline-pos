# Design System: Duka POS — "The Ledger" Concept

This document is the single source of truth for visual design. The coding agent should not invent colors, spacing, or component styling outside of what's defined here — every value in the UI traces back to a token in `globals.css`.

---

## 1. Concept

**Brief constraints (fixed, not up for reinterpretation):** white and blue only. The people using this — a shop owner, a manager, a cashier, a customer glancing at a receipt — should feel like they're using something a private bank or a boutique hotel would build for itself, not a bargain-bin till system.

**Direction: "The Ledger."** Kenyan dukas run on paper exercise books — a ledger, ruled by hand, where every number lines up in a column and every entry is accountable. This system takes that idea and renders it in glass and whitespace: generous white space, a single confident blue used sparingly, and a quiet signature device — a hairline rule — that recurs everywhere a number or a choice matters. Numbers (prices, quantities, invoice IDs, timestamps) are set in a monospaced figure style so they align like a real ledger column, which is also what makes a receipt or a sales table feel precise rather than generic.

What this explicitly avoids: no cream/terracotta warmth, no dark near-black dashboard-with-neon-accent look, no dense broadsheet hairline-grid layout. Those are the three current AI-design defaults — none fit "uptown, white, blue, POS."

---

## 2. Color

Two raw scales feed every semantic token. **To retheme the entire app, change the raw scale — never a semantic token directly.**

### 2.1 Blue scale (brand — "Sovereign Blue")
| Token | Hex | Use |
|---|---|---|
| `--blue-50` | `#EEF3FE` | tint backgrounds, hover states, selected-row fill |
| `--blue-100` | `#DCE7FD` | subtle badges, chip backgrounds |
| `--blue-200` | `#B7CFFB` | disabled-state accents, chart gridlines |
| `--blue-300` | `#8FB4F7` | secondary chart series |
| `--blue-400` | `#5C8FF0` | hover/active icon tint, dark-mode primary |
| `--blue-500` | `#3168E8` | "Soft" accent intensity option |
| `--blue-600` | `#1652D6` | **default primary** — buttons, links, active nav, focus ring |
| `--blue-700` | `#123FA8` | "Bold" accent intensity option, pressed states |
| `--blue-800` | `#0F337F` | dark-mode surfaces |
| `--blue-900` | `#0B1D33` | sidebar/navbar background, ink text on white |

### 2.2 Neutral scale ("Slate" — cool-toned, never warm-gray)
| Token | Hex | Use |
|---|---|---|
| `--slate-50` | `#F7F9FC` | app background (not pure white — see 2.3) |
| `--slate-100` | `#EEF2F7` | card hover, table row stripe |
| `--slate-200` | `#E1E7EF` | borders, dividers |
| `--slate-300` | `#C9D2DE` | disabled borders |
| `--slate-400` | `#9AA8BC` | placeholder text, disabled text |
| `--slate-500` | `#6B7A93` | secondary/muted text |
| `--slate-600` | `#4C5A72` | body text on light surfaces |
| `--slate-700` | `#37435A` | headings on light surfaces |
| `--slate-800` | `#232C3D` | dark-mode card surface |
| `--slate-900` | `#131A26` | dark-mode background |

### 2.3 Why not pure white everywhere
Pure `#FFFFFF` is reserved for **cards, dialogs, the POS product grid, and receipts** — the surfaces the "uptown" feeling should live on. The page canvas behind them is `--slate-50`, a near-imperceptible cool white, so cards read as objects sitting on the canvas rather than the whole screen blending into one white plane. This is the one deliberate departure from "flat white everywhere" and it's what makes the layout feel considered instead of default.

### 2.4 Semantic (status) colors — muted, not candy
| Token | Hex | Use |
|---|---|---|
| `--success` | `#12805C` | completed sale, in-stock badge |
| `--warning` | `#B4790A` | low-stock badge |
| `--destructive` | `#C4362E` | out-of-stock, delete actions, voided sale |

---

## 3. Typography

| Role | Typeface | Where |
|---|---|---|
| Display / heading | **Space Grotesk** | page titles, section headers, nav labels, KPI card labels |
| Body / UI | **Inter** | body copy, form fields, table cell text, buttons |
| Figures (numbers only) | **JetBrains Mono**, tabular numerals | prices, quantities, invoice numbers, timestamps, phone numbers, PINs |

The figures rule is the load-bearing detail of this whole system: **any time a number represents money, a count, an ID, or a date/time, it renders in the mono face with `font-variant-numeric: tabular-nums`.** This is what makes the sales table, the cart, and the PDF receipt feel like a ledger instead of a generic admin panel. Everything else (labels, names, buttons) stays in Inter/Space Grotesk.

Type scale (rem, on a 1.25 ratio):
```
--text-xs:   0.75rem   (12px)  — captions, table meta
--text-sm:   0.875rem  (14px)  — body small, form labels
--text-base: 1rem      (16px)  — body
--text-lg:   1.25rem   (20px)  — card titles
--text-xl:   1.563rem  (25px)  — section headers
--text-2xl:  1.953rem  (31px)  — page titles
--text-3xl:  2.441rem  (39px)  — Dashboard hero KPI figures
```

---

## 4. Layout & Signature

- **Sidebar**: fixed left, `--blue-900` background, white text, 240px wide, icon + label nav items (lucide-react icons). Active item gets the signature hairline: a 2px `--blue-400` rule on its left edge, not a filled pill background — quieter and more "uptown" than a solid highlight block.
- **Canvas**: `--slate-50` background, 32px outer padding, content max-width constrained on non-POS pages (~1280px) so text/tables don't stretch uncomfortably wide.
- **Cards**: white, 1px `--slate-200` border, 16px radius, no shadow at rest; a soft `shadow-sm` only appears on hover for interactive cards and on dialogs/sheets (elevation reserved for things that are actually "lifted").
- **The Ledger Rule (signature element)**: a 1px `--blue-600` rule appears in exactly three places, consistently: (1) under the active sidebar item, (2) directly above every "Total" row (cart, receipt, reports summary), (3) as the top edge of every Dashboard KPI card, replacing what would otherwise be a generic colored icon-in-a-circle. One device, three contexts, always meaning "this number is the one that matters."
- **Radius scale**: `--radius-sm: 8px` (inputs, badges), `--radius-md: 12px` (buttons), `--radius-lg: 16px` (cards, dialogs). Never mix radii within the same component family.
- **Motion**: restrained. 150ms ease-out for hover/press states, a single 200ms slide-up for Sheet/Dialog entry. No page-load animation sequences, no scroll-triggered reveals — this is a work tool used all day, not a marketing page; motion should feel instant and confident, not decorative.

---

## 5. Component Conventions (shadcn/ui)

Use shadcn/ui for **every** interactive primitive — no hand-rolled buttons, inputs, dropdowns, or modals. Uniformity comes from never bypassing the library, not from a style guide people have to remember.

- Install once via `npx shadcn@latest init`, answer "CSS variables: yes" (required — this is what makes the theme centrally swappable).
- All components pull color exclusively from the semantic CSS variables in §7 — never hardcode a hex value in a `.tsx` file. If a component needs a color not yet defined, add it to `globals.css` first.
- Buttons: `default` variant maps to `--primary` (blue-600 fill, white text) for the one primary action per view (e.g., "Complete Sale," "Save changes"). Every other action is `outline` or `ghost` — a screen should have exactly one filled blue button visible at a time so it's unambiguous what to do next.
- Badges: `Low stock` → warning token, `Out of stock` → destructive token, `In stock` → success token, all as `outline`-style badges (colored text/border, white fill) rather than solid-fill — solid badges read as louder/cheaper than this system wants to feel.
- Tables: shadcn `Table`, header row `--slate-600` text on `--slate-50`, body rows white with `--slate-100` on hover, numeric columns right-aligned in the mono figure style, name/text columns left-aligned in Inter.
- Forms: shadcn `Form` + React Hook Form + Zod, label above field, helper/error text in `--text-sm`, `--slate-500` (helper) or `--destructive` (error).

---

## 6. Accessibility & Quality Floor

- Contrast: `--blue-600` on white = 5.4:1 (passes AA for normal text); on `--blue-900` sidebar, body text is white (`21:1`), inactive nav labels use `--blue-200` (not `--slate-*`) to stay legible on the dark sidebar.
- All interactive elements keep a visible focus ring: `--ring` = `--blue-600` at 2px offset — never remove `:focus-visible` outlines.
- Respect `prefers-reduced-motion`: disable the 150–200ms transitions above when set.
- Every screen tested down to a 375px mobile viewport for the customer-facing receipt view, and down to a 1024px tablet viewport for `/pos` specifically.

---

## 7. `globals.css`

Single file, single source of truth. Semantic tokens reference the raw scales in §2 — retheming means editing the raw scale block, not hunting through components.

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ---- 1. RAW PALETTE — change these to retheme the whole app ---- */
    --blue-50: 224 82% 96%;
    --blue-100: 221 82% 92%;
    --blue-200: 219 83% 85%;
    --blue-300: 218 84% 76%;
    --blue-400: 217 82% 65%;
    --blue-500: 219 76% 57%;
    --blue-600: 221 78% 47%;   /* brand primary */
    --blue-700: 222 79% 36%;
    --blue-800: 221 78% 28%;
    --blue-900: 213 64% 12%;

    --slate-50: 216 38% 97%;
    --slate-100: 214 30% 94%;
    --slate-200: 214 32% 91%;
    --slate-300: 216 24% 82%;
    --slate-400: 215 18% 65%;
    --slate-500: 215 17% 47%;
    --slate-600: 214 27% 34%;
    --slate-700: 216 30% 24%;
    --slate-800: 217 30% 16%;
    --slate-900: 220 30% 10%;

    --success: 156 76% 27%;
    --warning: 38 84% 37%;
    --destructive-raw: 4 63% 47%;

    /* ---- 2. ACCENT INTENSITY — switched by Settings > Appearance ---- */
    /* data-accent="soft" | "standard" | "bold" on <html>, default = standard */
    --accent-soft: var(--blue-500);
    --accent-standard: var(--blue-600);
    --accent-bold: var(--blue-700);
    --accent-active: var(--accent-standard);

    /* ---- 3. SEMANTIC TOKENS (shadcn contract) — light mode ---- */
    --background: var(--slate-50);
    --foreground: var(--slate-700);

    --card: 0 0% 100%;
    --card-foreground: var(--slate-700);

    --popover: 0 0% 100%;
    --popover-foreground: var(--slate-700);

    --primary: var(--accent-active);
    --primary-foreground: 0 0% 100%;

    --secondary: var(--slate-100);
    --secondary-foreground: var(--slate-700);

    --muted: var(--slate-100);
    --muted-foreground: var(--slate-500);

    --accent: var(--blue-50);
    --accent-foreground: var(--blue-700);

    --destructive: var(--destructive-raw);
    --destructive-foreground: 0 0% 100%;

    --border: var(--slate-200);
    --input: var(--slate-200);
    --ring: var(--accent-active);

    --sidebar-background: var(--blue-900);
    --sidebar-foreground: 0 0% 100%;
    --sidebar-muted: var(--blue-200);
    --sidebar-active-rule: var(--blue-400);

    --chart-1: var(--blue-600);
    --chart-2: var(--blue-300);
    --chart-3: var(--success);
    --chart-4: var(--warning);
    --chart-5: var(--slate-400);

    --radius-sm: 0.5rem;
    --radius-md: 0.75rem;
    --radius-lg: 1rem;
    --radius: var(--radius-md); /* shadcn default hook */

    /* ---- 4. DENSITY — switched by Settings > Appearance ---- */
    /* data-density="comfortable" (default) | "compact" on <html> */
    --space-unit: 1rem;
  }

  [data-density='compact'] {
    --space-unit: 0.75rem;
  }

  [data-accent='soft'] {
    --accent-active: var(--accent-soft);
  }
  [data-accent='bold'] {
    --accent-active: var(--accent-bold);
  }

  /* ---- 5. DARK MODE ---- */
  .dark {
    --background: var(--slate-900);
    --foreground: var(--slate-100);

    --card: var(--slate-800);
    --card-foreground: var(--slate-100);

    --popover: var(--slate-800);
    --popover-foreground: var(--slate-100);

    --primary: var(--blue-400);
    --primary-foreground: var(--slate-900);

    --secondary: var(--slate-700);
    --secondary-foreground: var(--slate-100);

    --muted: var(--slate-700);
    --muted-foreground: var(--slate-400);

    --accent: var(--blue-800);
    --accent-foreground: var(--blue-100);

    --border: var(--slate-700);
    --input: var(--slate-700);
    --ring: var(--blue-400);

    --sidebar-background: 220 30% 6%;
    --sidebar-foreground: 0 0% 100%;
    --sidebar-muted: var(--slate-400);
    --sidebar-active-rule: var(--blue-400);
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  }
  h1, h2, h3, h4, .font-display {
    font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
  }
  .font-figures {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
}

@layer utilities {
  .ledger-rule-top {
    border-top: 1px solid hsl(var(--blue-600));
  }
  .ledger-rule-active {
    border-left: 2px solid hsl(var(--sidebar-active-rule));
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`tailwind.config.ts` must map these to Tailwind's color/radius scale (standard shadcn wiring — `colors: { primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' }, ... }`, `borderRadius: { lg: 'var(--radius-lg)', md: 'var(--radius-md)', sm: 'var(--radius-sm)' }`), plus a `fontFamily` extension registering `display`, `sans`, and `figures` to the three typefaces above so components can use `font-display` / `font-figures` utility classes instead of inline styles.

---

## 8. Settings → Appearance (applies system-wide, not per-user cosmetic toggle)

Add to `settings` table (§3 of blueprint.md): `themeMode` (`light | dark | system`, default `system`), `accentIntensity` (`soft | standard | bold`, default `standard`), `density` (`comfortable | compact`, default `comfortable`).

**Page (`/settings` → Appearance tab):**
- **Theme mode** — shadcn `RadioGroup` rendered as three preview cards (mini light/dark/auto swatches), not a plain dropdown — this is a settings page a shop owner should enjoy using.
- **Accent intensity** — three swatches showing the same blue at soft/standard/bold so the owner can pick how loud the brand color feels without ever leaving blue.
- **Density** — comfortable vs. compact toggle, useful for a cashier running the POS on a smaller tablet screen all day.
- Changes save via a server action (`updateAppearanceSettings()`), which does two things immediately: (1) writes to the `settings` row, (2) sets a cookie (`theme-prefs`) so the *next* server render already has the right `data-theme`/`data-accent`/`data-density` attributes on `<html>` — no flash of the old theme.

**Propagation mechanism (`app/layout.tsx`):**
```tsx
export default async function RootLayout({ children }) {
  const prefs = await getAppearancePrefs(); // reads settings row, falls back to cookie/default
  return (
    <html
      lang="en"
      className={prefs.themeMode === 'dark' ? 'dark' : ''}
      data-accent={prefs.accentIntensity}
      data-density={prefs.density}
    >
      <body>{children}</body>
    </html>
  );
}
```
For `themeMode: "system"`, pair this server-rendered default with a small client-side script (the shadcn/next-themes pattern) that reads `prefers-color-scheme` and toggles `.dark` client-side post-hydration, so the app still respects the device's OS setting when the owner hasn't forced a mode.

Because every component only ever reads `--primary`, `--background`, etc. (never a raw hex or a raw blue-N), this one settings page can restyle the entire system — sidebar, dashboard charts, POS buttons, receipt preview — without touching a single component file.

---

## 9. Build Checklist for the Coding Agent

- [ ] `globals.css` from §7 dropped in verbatim; no component ever imports a hex color directly.
- [ ] `tailwind.config.ts` wired to the CSS variables (§7 closing note).
- [ ] Google Fonts loaded via the `@import` in `globals.css` (or self-hosted via `next/font` for production — prefer `next/font/google` for Space Grotesk + Inter + JetBrains Mono to avoid a render-blocking request; document this swap in blueprint.md §12 if made).
- [ ] Every currency, quantity, invoice-number, phone-number, and timestamp value in the UI wrapped in `<span className="font-figures">`.
- [ ] Sidebar built once as a shared layout component — the ledger-rule active-state, not a filled pill, marks the current section.
- [ ] Dashboard KPI cards use `.ledger-rule-top`, not a colored icon badge, as their accent.
- [ ] Settings → Appearance tab implemented per §8, confirmed to restyle POS, Dashboard, and the receipt preview simultaneously when changed.
- [ ] Nothing in the shipped UI uses cream/terracotta, near-black-with-neon-accent, or a hairline-broadsheet newspaper grid — those are explicitly rejected directions for this brief.