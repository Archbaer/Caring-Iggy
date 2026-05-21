# Caring Iggy — Frontend AGENTS.md

> **Audience:** LLM agents (and humans) doing frontend work in `frontend/`.
> **How to use:** Before touching frontend code, read Part 1. Consult Part 2 only when
> doing redesign-polish work. Current palette is ocean-coral (blue canvas + coral accent).
>
> Last updated: 2026-05-22.

---

## HARD RULES (read first, never break)

1. **3 responsive tiers only.** Mobile (`<640`) → `sm:` (≥640) → `lg:` (≥1024). Use `md:` only when specifically needed (tablet landscape). Never skip `sm:`.
2. **No global `.ci-*` CSS classes.** No `.ci-card`, `.ci-section`, `.ci-btn`, etc. Use Tailwind utilities or primitives in `src/components/ui/`.
3. **Tokens, not hex.** Always `var(--color-*)`, `var(--shadow-*)`, `var(--max-width-*)`, `var(--font-*)`. Never `#FF6B4A` or `gray-500` inline.
4. **Deliberate spacing between components.** `gap-*`, `space-y-*`, or explicit `mb-*` — never let two cards/sections touch.
5. **Surgical changes.** Touch only what the task requires. Don't refactor adjacent code. Don't "improve" formatting on lines you didn't have to change.
6. **No client-side calls to microservices.** Browser → Next BFF route → microservice. Never `fetch("http://animal-service…")` from a client component.
7. **All mutations require CSRF.** Send `x-csrf-token` header matching the `ci_csrf` cookie.

---

# PART 1 — REFERENCE

## 1. Stack & file layout

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| React | 19 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` in `globals.css`) |
| Component primitives | `class-variance-authority` (CVA) + `@radix-ui/react-slot` for `asChild` |
| Animation | CSS `@keyframes` (default) + `framer-motion` (only where staged sequences are needed) |
| Icons | `lucide-react` |
| Auth | Cookie-based opaque session, BFF-mediated, CSRF-guarded |
| Testing | Playwright (E2E + API contract) |
| TypeScript | Strict |

**Directory tree (`frontend/src/`):**

```
src/
├─ app/                       # routes (App Router)
│  ├─ layout.tsx              # root: fonts + body shell + Header/Footer
│  ├─ globals.css             # tokens, animations, reduced-motion
│  ├─ page.tsx                # /
│  ├─ loading.tsx error.tsx not-found.tsx
│  ├─ about/ animals/ donate/ login/ signup/
│  ├─ dashboard/              # ADOPTER + STAFF + ADMIN landing
│  │  ├─ animals/ admin/ matches/ interests/ preferences/
│  └─ api/                    # BFF route handlers (POST/PUT/DELETE only here)
│     ├─ auth/ animals/ admin/ adopter/
├─ components/
│  ├─ ui/                     # design-system primitives (PURE, no business logic)
│  ├─ layout/                 # public-header, public-footer, header-nav, logout-button
│  ├─ animals/ auth/ dashboard/ admin/   # feature components
└─ lib/
   ├─ api/                    # server fetchers (`*.ts`) + client mutators (`*-client.ts`)
   ├─ auth/                   # session, CSRF, role-check, server.ts (route helpers)
   ├─ constants/              # config (service URLs), status-map, animal-options
   ├─ types/                  # shared TS types
   └─ utils/                  # url, animal-editor helpers
```

**Path alias:** `@/*` → `src/*` (see `tsconfig.json`).

---

## 2. Design tokens

All tokens live in `src/app/globals.css` under `:root`. Reference via `var(--…)`. **Never inline hex.**

### 2.1 Palette

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#F0F7FF` | Page background (default body) |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-warm` | `#E8F4FD` | Secondary surfaces, hover backgrounds |
| `--color-surface-deep` | `#0A2A4A` | Header background, dark CTAs |
| `--color-ink` | `#081D35` | Headings, primary text |
| `--color-ink-soft` | `#2E5986` | Body text, secondary copy |
| `--color-ink-faint` | `#7AAFD4` | Captions, disabled states |
| `--color-ink-on-dark` | `#E8F4FD` | Text on `--color-surface-deep` |
| `--color-primary` | `#0E6BAD` | Ocean blue — primary buttons, links |
| `--color-primary-deep` | `#094F82` | Primary hover |
| `--color-primary-pale` | `#D6EEFF` | Primary tints, badge backgrounds |
| `--color-accent` | `#FF6B4A` | Coral — CTAs (donate, register interest), eyebrows |
| `--color-accent-deep` | `#E04D2C` | Accent hover |
| `--color-accent-pale` | `#FFE8E2` | Accent tints |
| `--color-success` / `--color-success-bg` | `#0E9E6F` / `#D4F5EA` | Success states |
| `--color-danger` / `--color-danger-deep` / `--color-danger-bg` | `#D63031` / `#A82525` / `#FFE8E8` | Errors, destructive |
| `--color-warning` / `--color-warning-bg` | `#E17B2A` / `#FFF0DC` | Warning chips |
| `--color-border` / `--color-divider` | `#C2DFF5` / `#A8CEEA` | Card borders, dividers |

### 2.2 Shadows (ocean-tinted)

`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`,
`--shadow-card`, `--shadow-card-hover`, `--shadow-coral` (for coral CTAs).

### 2.3 Gradients

`--gradient-hero`, `--gradient-cta`, `--gradient-card-hover`, `--gradient-admin-canvas`, `--gradient-donate-hero`.

### 2.4 Width tokens

| Token | Value | Use |
|---|---|---|
| `--max-width-content` | `72rem` | Default page max-width (text-heavy pages) |
| `--max-width-wide` | `90rem` | App pages with grids (animals, dashboard) |
| `--max-width-full` | `100%` | Hero / edge-to-edge sections |

Page shell pattern: `max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6`.

### 2.5 Typography

| Family | Var | Font | Use |
|---|---|---|---|
| Display | `--font-display` | Nunito | Headings (`h1`, `h2`, brand) |
| Body | `--font-body` | Plus Jakarta Sans | Body text (default on `<body>`) |
| Mono | `--font-mono` | Space Mono | Eyebrows, tabular labels |

Fonts are loaded via `next/font/google` in `app/layout.tsx`. Reference with:
```tsx
className="font-[family-name:var(--font-display)]"
```

### 2.6 Token-usage rules

**WHEN** any color, shadow, max-width, or font appears in a component.

**EXAMPLE (good):**
```tsx
<div className="bg-[var(--color-surface)] shadow-[var(--shadow-card)] text-[var(--color-ink)]">
```

**COUNTER-EXAMPLE (forbidden):**
```tsx
<div className="bg-white shadow-md text-slate-900">          // raw Tailwind colors
<div style={{ backgroundColor: '#FFFFFF' }}>                 // hex
<div className="text-gray-500">                              // Tailwind grayscale — use --color-ink-soft / --color-ink-faint
```

The one inline-hex exception is the existing `globals.css` token definitions themselves.

---

## 3. UI primitives

All under `src/components/ui/`. Each is **pure** — no data fetching, no business logic, no session calls.

### 3.1 Button — `src/components/ui/button.tsx`

CVA-based. `asChild` prop wraps children in `Slot` (radix) for use with `Link`.

**Variants:** `default` (primary ocean), `accent` (coral CTA), `destructive`, `outline`, `secondary`, `ghost`, `link`.
**Sizes:** `default` (h-10), `sm` (h-9), `lg` (h-11), `xl` (h-12), `icon` (h-10 w-10).

**WHEN to use which variant:**
- `default` — primary action on most pages (submit, confirm).
- `accent` — coral, reserved for the page's single most important CTA (donate, register interest, sign up). One per section, max.
- `outline` — secondary action next to a primary.
- `destructive` — delete / withdraw.
- `ghost` — toolbar / inline actions.
- `link` — inline text-style links inside flowing copy.
- `secondary` — neutral fallback.

**EXAMPLE:**
```tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

<Button asChild variant="accent" size="lg">
  <Link href="/animals">Find your match</Link>
</Button>
```

**COUNTER-EXAMPLE:** Building a button from raw classes when a Button variant fits — see homepage hero CTAs (`src/app/page.tsx:113-119`) for legacy inline buttons that should migrate to `<Button asChild variant="accent">`.

### 3.2 Card — `src/components/ui/card.tsx`

Wrapper with three variants. Default `as="article"`; pass `as={...}` for semantic alternatives.

| Variant | Classes |
|---|---|
| `panel` (default) | `rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] p-6` |
| `route` | panel + `p-5 grid gap-3` (for dashboard route tiles) |
| `hero` | panel + `p-6 sm:p-8` (for top-of-page hero blocks) |

**EXAMPLE:**
```tsx
<Card variant="hero" as="section">
  <Eyebrow>Section label</Eyebrow>
  <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--color-ink)]">Title</h1>
</Card>
```

**COUNTER-EXAMPLE:** Hand-rolling `rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] p-6` directly in a page is forbidden — use `<Card>`.

### 3.3 Badge — `src/components/ui/badge.tsx`

**Variants:** `available`, `pending`, `adopted`, `muted`, `accent`, `admin`, `staff`, `volunteer`.

**WHEN:** animal status pills, role tags. Map status codes via `statusToBadgeVariant()` in animal cards (see `src/components/animals/animal-card.tsx:13-28`).

**EXAMPLE:**
```tsx
<Badge variant="available">Available</Badge>
<Badge variant="muted">{session.role}</Badge>
```

### 3.4 Eyebrow — `src/components/ui/eyebrow.tsx`

The mono uppercase tracked label above section titles. **Single source of truth — never hand-roll.**

**EXAMPLE:**
```tsx
import { Eyebrow } from "@/components/ui/eyebrow";

<Eyebrow>Shelter catalog</Eyebrow>
<h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-ink)]">
  Find your companion
</h1>
```

**COUNTER-EXAMPLE (forbidden — many places still do this):**
```tsx
<p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)] mb-1">
  Shelter catalog
</p>
```
Found in `src/app/animals/page.tsx:113`, `src/app/page.tsx:99`, etc. — these should become `<Eyebrow>` (see P2 in playbook).

### 3.5 ActionLink — `src/components/ui/action-link.tsx`

Three variants:
- `primary` — inline coral text link
- `secondary` — muted text link
- `chip` — rounded pill link with hover ring (also `size="lg"`)

**WHEN:** in-card links, related-content nav, "Manage X" routes from dashboard tiles.

**EXAMPLE:**
```tsx
<ActionLink href="/animals" variant="chip">Manage animals</ActionLink>
```

### 3.6 SuccessCard — `src/components/ui/success-card.tsx`

`"use client"`. Framer-motion-animated success panel with title + field list + primary/optional secondary CTA.

**WHEN:** after a form submission that should celebrate the outcome (animal created, etc).

**EXAMPLE:** see `src/components/animals/animal-creator.tsx` for usage.

### 3.7 What primitives DO NOT exist yet (build these — see P3)

- `Skeleton` — for loading states
- `EmptyState` — for empty/zero-result blocks
- `MobileMenu` — for the mobile nav drawer (see P1)

---

## 4. Layout primitives

### 4.1 Root layout — `src/app/layout.tsx`

Already sets:
- 3 fonts via `next/font/google` (`Nunito`, `Plus_Jakarta_Sans`, `Space_Mono`)
- `<body>` font, color, canvas background
- `<PublicHeader />` (server component, async, reads session) + `<PublicFooter />`
- `<main className="flex-1 py-8">` — **does NOT constrain width**. Each page sets its own `max-w-`.

**Rule:** never put global width constraints in `layout.tsx`. Pages own width.

### 4.2 Page shell pattern

```tsx
export const dynamic = "force-dynamic"; // any page reading session or fresh data

export default async function MyPage() {
  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8 bg-canvas-pattern">
      {/* page content */}
    </div>
  );
}
```

- `max-w-[var(--max-width-wide)]` for grid-heavy pages, `--max-width-content` for text-heavy.
- `bg-canvas-pattern` adds the dot-grid background (dashboard/animals). Omit for hero pages.
- `pt-20` accounts for the sticky header (h-16) + breathing room.

### 4.3 Header — `src/components/layout/public-header.tsx`

Server component, calls `getCurrentSession()`. Includes:
- Brand link
- Desktop nav (`hidden sm:flex`) with role-aware items
- Mobile hamburger button (currently **disabled** — fix in P1)

**Rule:** any nav item changes require a parallel update to the upcoming `MobileMenu` component (after P1).

### 4.4 Footer — `src/components/layout/public-footer.tsx`

Static. Visible on all routes. Keep contact info / nav links in sync if you add routes.

---

## 5. Architecture patterns

### 5.1 Default to RSC

**Rule:** components are server components by default. Add `"use client"` only when you need state, event handlers, browser APIs, or animation libs that require it.

**Current client components** (audit before adding more):
- `components/ui/success-card.tsx` (framer-motion)
- `components/auth/login-form.tsx`, `signup-form.tsx`
- `components/layout/header-nav.tsx`, `logout-button.tsx`
- `components/admin/*-detail-client.tsx`, `*-edit-panel.tsx`
- `components/dashboard/interests-manager.tsx`, `preferences-form.tsx`
- `components/animals/animal-creator.tsx`, `animal-editor.tsx`, `animal-form-fields.tsx`, `animal-image.tsx`, `register-interest-button.tsx`, `animal-filters.tsx`, `animal-editor-slot.tsx`

### 5.2 BFF (Backend-for-Frontend) flow

Browser **never** talks to microservices directly. Two flow shapes:

**(a) Reads (RSC fetches):**
```
RSC page → import { fetchX } from "@/lib/api/x"
       → fetchX uses serviceUrl("ANIMAL", "/api/animals")
       → microservice URL is server-only (process.env.ANIMAL_SERVICE_URL)
```

**(b) Writes (client mutations):**
```
Client component → fetch("/api/animals/create", { method: "POST", headers: { x-csrf-token } })
                → BFF route handler at src/app/api/.../route.ts
                → route handler calls validateAnimalMutationCsrf + requireAnimalEditorRequest
                → then calls lib/api/animals.ts createAnimal()
                → microservice
```

**Server fetcher template** (`src/lib/api/<resource>.ts`):
```tsx
import { serviceUrl } from "./client";

export class XServiceError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message); this.name = "XServiceError"; this.status = status; this.body = body;
  }
}

export async function fetchX(): Promise<X> {
  const res = await fetch(serviceUrl("X_SERVICE_KEY", "/api/x"), { cache: "no-store" });
  if (!res.ok) throw new XServiceError(`Failed: ${res.status}`, res.status, await safeReadJson(res));
  return res.json();
}
```
**Required:** `cache: "no-store"` on every microservice fetch (data is dynamic).

**Client mutator template** (`src/lib/api/<resource>-client.ts`):
```tsx
import { CSRF_HEADER_NAME } from "@/lib/auth/csrf";

export async function createX(body: XCreate, csrfToken: string): Promise<X> {
  const res = await fetch("/api/x/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", [CSRF_HEADER_NAME]: csrfToken },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new XApiError(await readBffError(await safeReadJson(res), res.status));
  return res.json();
}
```

**Route handler template** (`src/app/api/<resource>/<verb>/route.ts`):
```tsx
import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/client";

export async function POST(request: NextRequest): Promise<Response> {
  const access = await requireXRequest(request);           // role check
  if (!access.ok) return access.response;

  const csrf = await validateXMutationCsrf(request);       // CSRF check
  if (!csrf.ok) return csrf.response;

  const parsed = await parseCreateXBody(request);          // schema validation
  if (!parsed.ok) return errorResponse(parsed.error);

  try {
    return jsonResponse(await createX(parsed.body), { status: 201 });
  } catch (error) {
    return errorResponse(toXBffError(error, "X creation could not be completed right now."));
  }
}
```
Reference impl: `src/app/api/animals/create/route.ts`.

### 5.3 Service URL config

`src/lib/constants/config.ts` exposes `SERVICES.ANIMAL | USER | ADOPTER` via getters that throw if env is missing. **Server-only.** Never imported from a `"use client"` file.

### 5.4 CSRF — `src/lib/auth/csrf.ts`

- Cookie name: `ci_csrf` (signed `token.signature`, not HttpOnly so client can read).
- Header name: `x-csrf-token`.
- Safe methods (`GET`/`HEAD`/`OPTIONS`) skip validation.
- Issue/rotate via `issueCsrfToken()` after every auth state change (login, logout, session reads).
- Validation: origin/referer trusted-host check + timing-safe cookie/header compare.

**Rule:** every BFF mutation route (POST/PUT/DELETE) MUST call `validateCsrfRequest` (or a helper that does) before touching upstream.

### 5.5 Session & role gating — `src/lib/auth/`

- `getCurrentSession()` — reads `ci_session` + `ci_session_state` cookies → `AuthSession | null`.
- `getRequiredRoleSession(role)` — redirects if not authenticated or wrong role.
- `getRequiredRoleGroupSession(roles)` — same, for multi-role allowlists.
- `defaultRouteForRole(role)` — canonical landing per role.
- `evaluatePathAccess(pathname, session)` — authoritative path-access decision.
- Roles: `"ADOPTER" | "STAFF" | "ADMIN"` (see `AUTH_ROLE_VALUES`).

**Rule:** in any page reading session, redirect logic happens BEFORE rendering:
```tsx
const session = await getCurrentSession();
if (!session) redirect(`${LOGIN_ROUTE}?redirect=/dashboard`);
if (session.role === "ADMIN") redirect("/dashboard/admin");
```

### 5.6 Error contract — `BffError`

All BFF errors return `{ status, code, message, fieldErrors? }`. Use `bffError()` to build, `errorResponse()` to serialize. Client mutators rebuild via `readBffError()` and throw a typed `*ApiError`.

---

## 6. Page recipe — building a new RSC page

```tsx
// src/app/<route>/page.tsx
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";
import { fetchX } from "@/lib/api/x";
import { getCurrentSession } from "@/lib/auth/server-session";
import { LOGIN_ROUTE } from "@/lib/auth/role-check";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  // 1. Auth / redirects
  const session = await getCurrentSession();
  if (!session) redirect(`${LOGIN_ROUTE}?redirect=/my-route`);

  // 2. Data (server fetchers — handle errors)
  let data: X[];
  try {
    data = await fetchX();
  } catch {
    // render error UI (see Section 7 — states)
    return <ErrorState message="X is temporarily unavailable." />;
  }

  // 3. Render
  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-4 sm:px-6 pt-20 pb-8">
      <Card variant="hero" as="section" className="mb-6">
        <Eyebrow>Section label</Eyebrow>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--color-ink)]">
          Page title
        </h1>
      </Card>

      {data.length === 0 ? <EmptyState … /> : <List items={data} />}
    </div>
  );
}
```

**Rules:**
- `export const dynamic = "force-dynamic"` on any page reading session/cookies/fresh data.
- Always import primitives over hand-rolling.
- Server-fetcher errors are caught and rendered as inline `EmptyState`/`ErrorState`, NOT thrown (which would trigger `error.tsx`). Use `error.tsx` only for unhandled bugs.

---

## 7. States: loading / empty / error

> **Current state is broken.** All `loading.tsx`, `error.tsx`, `not-found.tsx` use class names (`support-shell`, `not-found-title`, `skeleton-card`, etc.) that are not defined in any CSS file. They render unstyled. Fix in P3.

### 7.1 Loading state recipe (after P3)

```tsx
// src/app/<route>/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8" aria-busy="true" aria-live="polite">
      <Skeleton variant="hero" />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );
}
```

### 7.2 Empty state recipe (after P3)

```tsx
<EmptyState
  eyebrow="No results"
  title="No animals match those filters."
  body="Try a different status or clear the type filter."
  cta={{ href: "/animals", label: "Clear filters" }}
/>
```

### 7.3 Error state recipe (after P3)

```tsx
// src/app/<route>/error.tsx — for unhandled errors
"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      eyebrow="Route error"
      title="Something went wrong."
      body={error.message || "Please retry."}
      onRetry={reset}
      homeHref="/"
    />
  );
}
```

### 7.4 Reasoned errors (NOT thrown)

When a server fetcher fails predictably (microservice down, 404, etc.), catch in the page and render an inline error card with the same `EmptyState`/`ErrorState` primitive — don't propagate to `error.tsx`.

---

## 8. Responsive design

### 8.1 Three tiers (project rule — also in root `CLAUDE.md`)

| Tier | Range | Prefix |
|---|---|---|
| Mobile | < 640px | (none) |
| Tablet | ≥ 640px | `sm:` |
| Desktop | ≥ 1024px | `lg:` |

Test at: **375 / 768 / 1280 px**.

### 8.2 Default grids

- Animal-card grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6` (4-up on desktop in animals page; 1/2/3 elsewhere).
- Dashboard card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`.

### 8.3 `md:` exception

Use `md:` (768px) only for tablet-landscape layouts where 640-1023 needs an in-between column count. Document the reason inline in a one-line comment.

### 8.4 Sidebar+content layout

```tsx
<div className="flex flex-col gap-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
  {/* sidebar */}
  {/* main */}
</div>
```
Mobile: stack. Desktop: 260px sidebar + flexible main.

---

## 9. Animations

### 9.1 Available CSS animations (`globals.css`)

- `.animate-fade-up` — 16px upward fade-in (0.5s).
- `.animate-hero-reveal` — 24px upward fade-in (0.7s).
- `.animate-card-spring-in` — scale-bounce entrance.
- `.delay-1..delay-6` — stagger helpers (0.05s steps).

**Stagger pattern:**
```tsx
{items.map((item, i) => (
  <article key={item.id} className={`animate-fade-up delay-${(i % 6) + 1}`}>
    …
  </article>
))}
```

### 9.2 Reduced-motion

`globals.css` already disables `animate-fade-up`, `animate-hero-reveal`, `animate-card-spring-in` under `@media (prefers-reduced-motion: reduce)`.

**Rule for framer-motion:** if you add `motion.*` animations, wrap them in a `useReducedMotion()` check:
```tsx
import { motion, useReducedMotion } from "framer-motion";
const reduceMotion = useReducedMotion();
const variants = reduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : richVariants;
```

### 9.3 Don't over-animate

- Page-level entrance: one `animate-fade-up` on the top section, staggered children if grid.
- Buttons: `transition-all duration-200`, `active:scale-[0.97]`, no entrance animations.
- Cards: hover lift `hover:-translate-y-2 hover:shadow-[var(--shadow-card-hover)]`.

---

## 10. Accessibility baseline

### 10.1 Focus rings

Every interactive element gets a visible focus ring. Default pattern:
```tsx
focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2
```
The `Button` primitive already includes this — match for custom interactive elements.

### 10.2 Decorative content

Emoji-as-icon → `aria-hidden="true"`. Example: brand `🐾` in header, `❤️` on donate button.

### 10.3 Icon-only buttons

Always get an `aria-label`:
```tsx
<button type="button" aria-label="Open menu" …>
  <Menu aria-hidden="true" />
</button>
```

### 10.4 Headings

One `<h1>` per route. Subsections use `<h2>`/`<h3>` in document order.

### 10.5 Forms

- Labels paired with inputs (use `<label htmlFor>` or wrap).
- Field errors announced via `aria-describedby` pointing to the error message.
- Submit buttons disabled during pending state, with `aria-busy="true"`.

### 10.6 Contrast targets

- Body text on `--color-canvas`: `--color-ink-soft` is the floor.
- Coral (`--color-accent`) on white: only at 16px+ bold (large-text rule). For small coral text use `--color-accent-deep`.

---

## 11. Conventions & forbidden patterns

**Forbidden:**
- Global `.ci-*` CSS classes (rule from root `CLAUDE.md`).
- Tailwind grayscale (`gray-*`, `slate-*`, `neutral-*`) — use `--color-ink*` tokens.
- Inline hex / RGB except inside `globals.css` token defs.
- Client-side fetch directly to microservices.
- `any` in new code (configure as strict).
- `<a>` for internal navigation — always `next/link`'s `<Link>`.
- Width constraint in `app/layout.tsx`.
- Importing `lib/constants/config.ts` from a `"use client"` module.
- Skipping CSRF validation in a BFF mutation route.
- Adding `error.tsx`/`loading.tsx` files using the orphan classes (`support-shell`, etc.) — those classes don't exist.

**Conventions:**
- File naming: kebab-case (`animal-card.tsx`, `register-interest-button.tsx`).
- Component names: PascalCase, export name matches file.
- Server fetchers in `lib/api/<resource>.ts`, client mutators in `lib/api/<resource>-client.ts`.
- `BffError`-shaped errors at every BFF boundary.
- One pure primitive per file in `components/ui/`.
- Feature components live in `components/<feature>/`.

---

## 12. Testing — Playwright

`frontend/playwright.config.ts` defines projects:

| Project | Tests | Auth state |
|---|---|---|
| `setup` | `*.setup.ts` | n/a — authenticates 3 roles |
| `api` | `tests/api/*.spec.ts` | none (uses fetch directly) |
| `anon` | `tests/auth/*.spec.ts` | empty storage state |
| `staff-forms` | `tests/forms/*.spec.ts` | `.auth/staff.json` |

**Scripts:**
- `npm run test:e2e` — all projects
- `npm run test:smoke` — `--grep @smoke`
- `npm run test:auth` — anon + admin + staff
- `npm run test:api` — API contract only

**Rule:** any new mutation route needs an API contract spec; any new auth-gated UI needs a redirect spec.

**Tag:** add `@smoke` to the single highest-signal test for each feature so it runs in CI's smoke job.

---

# PART 2 — REDESIGN POLISH PLAYBOOK

> Apply in order. Each task is self-contained: **Files / Spec / Acceptance / Verify**. Each can be a separate commit/PR.

## P0 — Dead CSS & orphan class cleanup

**Why:** `globals.css` has unused media queries and a `.animate-shimmer` rule with no consumers. `src/app/page.tsx:128,150` references an `animate-[hero-image-reveal_…]` keyframe that doesn't exist anywhere — silently does nothing. Separately, the support pages (`loading.tsx`, `error.tsx`, `not-found.tsx` at root, `dashboard/`, `animals/`) reference class names that don't exist anywhere — they render unstyled. P0 only deletes/fixes the unused CSS; the broken support pages get rebuilt in P2.

**Files:**
- `src/app/globals.css`
- `src/app/page.tsx`

**Spec:**

1. Delete these blocks from `globals.css`:
   - `@keyframes shimmer` (around lines 125-128)
   - `.animate-shimmer` and `.animate-shimmer::after` (around lines 142-152)
   - The three legacy `@media` blocks targeting non-existent classes:
     - `@media (max-width: 640px) { .animals-layout … }`
     - `@media (max-width: 900px) { .adopter-detail-grid … }`
     - `@media (max-width: 1100px) { .hero-split … }`
2. **Keep** the `@media (prefers-reduced-motion: reduce)` block. It's load-bearing.
3. In `src/app/page.tsx:128,150` — the `animate-[hero-image-reveal_900ms_cubic-bezier(0.22,1,0.36,1)_200ms_both]` class references an undefined keyframe. Two options (pick one, document choice in commit):
   - **(a)** Define the keyframe in `globals.css` (matches likely original intent — opacity 0 + scale 0.96 → opacity 1 + scale 1):
     ```css
     @keyframes hero-image-reveal {
       from { opacity: 0; transform: scale(0.96); }
       to   { opacity: 1; transform: scale(1); }
     }
     ```
     and add it to the reduced-motion block.
   - **(b)** Remove the class from `page.tsx:128,150` entirely.

**Acceptance:**
- `rg "animate-shimmer|animals-layout|adopter-detail-grid|hero-split" frontend/src` returns nothing.
- `rg "hero-image-reveal" frontend/src` returns either (a) `globals.css` + `page.tsx`, or (b) nothing.
- `npm run build` passes.
- Manual visual diff: zero regressions on `/`, `/animals`, `/dashboard`, `/dashboard/admin/adopters/[id]`.

**Verify:**
```bash
cd frontend
rg "animate-shimmer|animals-layout|adopter-detail-grid|hero-split" src && echo "FAIL: orphans remain" || echo "OK"
npm run build
```

---

## P1 — Mobile menu

**Why:** `src/components/layout/public-header.tsx:76-87` has a disabled hamburger button (`disabled aria-disabled="true"`) with a `// TODO: implement mobile menu toggle` comment. Mobile users can't navigate.

**Files:**
- `src/components/layout/public-header.tsx` (modify)
- `src/components/layout/mobile-menu.tsx` (new — client component)

**Spec:**

`MobileMenu` is a client component (disclosure pattern). Drawer slides in from the right on `sm:hidden` viewports. Mirrors the desktop nav items (Animals, About, Donate, conditionally Dashboard/Login/Signup, Logout).

Required behavior:
- Toggle button (already in header markup) controls `open` state.
- Drawer overlays the page; backdrop click closes.
- `ESC` closes.
- Focus moves into the drawer on open; on close, focus returns to the toggle.
- Closes automatically on route change — `useEffect` watching `usePathname()`.
- `aria-expanded` on toggle reflects state; `aria-controls` points to drawer id.
- `aria-modal="true"` and `role="dialog"` on the drawer.
- Backdrop: `bg-[var(--color-ink)]/40`. Drawer: `bg-[var(--color-surface-deep)] text-[var(--color-ink-on-dark)]` to match header palette.

Pass session info into `MobileMenu` from `PublicHeader` (server) — props only; do not call `getCurrentSession` from the client component.

**Acceptance:**
- At `<640px`, hamburger renders enabled; click opens drawer with all nav items.
- All nav items are keyboard-focusable in DOM order.
- `ESC` closes; backdrop click closes; route change closes.
- Desktop nav unchanged (drawer hidden at `sm:` and up).
- `npm run lint` passes (no `<a>` for internal nav).
- New Playwright test: `tests/auth/mobile-menu.spec.ts` (uses `devices['iPhone 13']`).

**Verify:**
```bash
cd frontend
npm run dev
# Then: open /, resize to 375px, click hamburger, tab through items, press ESC.
```

---

## P2 — States primitives + adopt across routes

**Why:** Inline empty-state divs duplicate the same pattern across `src/app/animals/page.tsx`, `src/app/dashboard/page.tsx`, and admin pages. All `loading.tsx`/`error.tsx`/`not-found.tsx` files reference undefined CSS classes (`support-shell`, `skeleton-card`, etc.). The fix is to build two primitives and adopt them.

**Files (new):**
- `src/components/ui/skeleton.tsx`
- `src/components/ui/empty-state.tsx`

**Files (rewrite to use primitives):**
- `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- `src/app/dashboard/loading.tsx`, `src/app/dashboard/error.tsx`
- `src/app/animals/loading.tsx`, `src/app/animals/error.tsx`
- Inline empty/error blocks in `src/app/animals/page.tsx:139-159`, `src/app/dashboard/page.tsx` (look for inline error sections).

**Spec — Skeleton:**

```tsx
// src/components/ui/skeleton.tsx
type SkeletonProps = {
  variant?: "card" | "hero" | "text" | "circle";
  className?: string;
};

// classes per variant:
// card:   rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-warm)] aspect-[4/3] animate-pulse
// hero:   rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-warm)] h-32 animate-pulse
// text:   rounded-full bg-[var(--color-surface-warm)] h-3 w-3/4 animate-pulse
// circle: rounded-full bg-[var(--color-surface-warm)] h-10 w-10 animate-pulse
```
Use Tailwind's built-in `animate-pulse` (already enabled). Respect reduced-motion: extend `globals.css` reduced-motion block to include `.animate-pulse { animation: none !important; }`.

**Spec — EmptyState:**

```tsx
// src/components/ui/empty-state.tsx
type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: { href: string; label: string };
  className?: string;
  variant?: "info" | "error";
};

// Renders:
// rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] p-8 sm:p-12 text-center
// → Eyebrow (using Eyebrow primitive)
// → h2 font-display font-extrabold text-[var(--color-ink)]   (or --color-ink-soft for variant=info)
// → p text-[var(--color-ink-soft)]
// → optional <Button asChild><Link href={cta.href}>{cta.label}</Link></Button>
// variant=error: border color shifts to var(--color-danger)/40, eyebrow color stays accent
```

**Spec — rewrite support pages:**

All `loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8" aria-busy="true" aria-live="polite">
      <Skeleton variant="hero" className="mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );
}
```

All `error.tsx`:
```tsx
"use client";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-4 sm:px-6 pt-20 pb-8">
      <EmptyState
        variant="error"
        eyebrow="Route error"
        title="Something interrupted this page."
        body={error.message || "Please try again."}
        cta={{ href: "/", label: "Return home" }}
      />
      <div className="mt-4 text-center">
        <button type="button" onClick={reset} className="text-[var(--color-primary)] underline-offset-4 hover:underline">
          Try again
        </button>
      </div>
    </div>
  );
}
```

`not-found.tsx`:
```tsx
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="max-w-[var(--max-width-content)] mx-auto px-4 sm:px-6 pt-20 pb-8">
      <EmptyState
        eyebrow="Not found"
        title="This route does not exist."
        body="Check the URL or head back to the homepage."
        cta={{ href: "/", label: "Back to home" }}
      />
    </div>
  );
}
```

Inline empty blocks in pages — replace with `<EmptyState … />`.

**Acceptance:**
- `rg "support-shell|not-found-title|skeleton-card|skeleton-grid|support-copy|support-actions|primary-link|secondary-link" frontend/src` → 0 matches.
- `Skeleton` and `EmptyState` exported and used in ≥3 places each.
- All support pages render styled (visual check).
- Reduced-motion media query disables skeleton animation.

**Verify:**
```bash
cd frontend
rg "support-shell|not-found-title|skeleton-card" src && echo "FAIL" || echo "OK"
npm run build
npm run dev   # visit / , force a 404, throw in a page to test error.tsx
```

---

## P3 — Primitive consolidation across pages

**Why:** Pages bypass `Eyebrow`, `Card`, `Badge` despite the primitives existing. This causes drift — every fix has to be applied N times.

**Files (audit + rewrite — surgical only, no layout changes):**
- `src/app/page.tsx`
- `src/app/animals/page.tsx`
- `src/app/about/page.tsx`
- `src/app/donate/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/admin/page.tsx`

**Replacements (find → replace):**

1. **Hand-rolled eyebrow → `<Eyebrow>`**
   - Pattern to find: `<p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em] text-[var(--color-accent)] …">…</p>`
   - Replace with: `<Eyebrow>…</Eyebrow>` (drop `mb-*` if `<Eyebrow>` is followed by a heading — let `gap-*` on parent handle spacing).
2. **Hand-rolled card → `<Card variant={…}>`**
   - Pattern: standalone `<section|article|div className="rounded-3xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] p-6 …">`.
   - Replace with `<Card variant="panel">` (or `hero` if `p-6 sm:p-8`).
3. **Hand-rolled status pill → `<Badge variant={…}>`**
   - Already used in `animal-card.tsx`. Audit `src/app/dashboard/admin/page.tsx` and others for any inline pills with the same shape.

**Rules during this pass:**
- Don't change copy, layout, or spacing beyond what's required to swap the primitive.
- Don't migrate hero buttons in `page.tsx:113-126` yet — those use a custom dark-theme variant on the home hero (`shadow-coral` etc.); migrating requires either an `accent-large` Button variant or accepting a small visual diff. **Out of scope for P3** — flag for a separate ticket.
- Stop using inline `font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.15em]` outside `Eyebrow`.

**Acceptance:**
- `rg "font-\[family-name:var\(--font-mono\)\] text-xs uppercase tracking-\[0\.15em\]" frontend/src --type tsx --type ts` returns only `components/ui/eyebrow.tsx`.
- No new visual regressions on `/`, `/animals`, `/about`, `/donate`, `/dashboard`, `/dashboard/admin`.
- `npm run build` passes; `npm run lint` passes.

**Verify:**
```bash
cd frontend
rg "font-\[family-name:var\(--font-mono\)\] text-xs uppercase tracking-\[0\.15em\]" src \
  | grep -v "components/ui/eyebrow.tsx" \
  && echo "FAIL: eyebrow patterns remain inline" || echo "OK"
npm run build && npm run lint
```

---

## P4 — Accessibility pass

**Why:** Several gaps surface from a manual audit. Coral on white text is borderline at small sizes. Decorative emoji aren't hidden from AT. Some interactive elements lack visible focus rings.

**Files (audit list):**
- `src/components/layout/public-header.tsx` — brand emoji `🐾` (line ~22), donate button `❤️` (line ~43), disabled hamburger.
- `src/components/animals/animal-card.tsx` — coral text on accent-pale chip background (line 82-83).
- `src/app/page.tsx` — hero CTAs, trust-point copy.
- All `<button>` and `<Link>` elements lacking `focus-visible:` classes.

**Spec:**

1. **Decorative emoji:** wrap in `<span aria-hidden="true">…</span>` (or add `aria-hidden` to the parent if the whole element is decorative). Brand link emoji is decorative because the text "Caring Iggy" is already there.
2. **Icon-only buttons:** ensure `aria-label`. The mobile hamburger (after P1) already has `aria-label="Open menu"`.
3. **Focus rings:** every interactive element gets `focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]/70 focus-visible:outline-offset-2`. Apply to:
   - Header nav links (currently rely on hover only).
   - Footer links.
   - Animal card "View profile" / "Edit" links.
   - Filter chips (already partly done in `animal-filters.tsx:53`).
4. **Coral contrast:** any coral text smaller than 16px bold switches to `var(--color-accent-deep)`. Specifically:
   - `animal-card.tsx:82` — `text-[var(--color-accent)]` on a `bg-[var(--color-accent-pale)]` chip at `text-sm font-bold` — verify contrast ≥4.5; if not, swap to `--color-accent-deep`.
   - Eyebrows are mono-tracked uppercase, generally large enough; verify in audit.
5. **Heading hierarchy:** one `<h1>` per route. Walk every page and confirm. Especially check `dashboard/page.tsx` — staff/admin branch + adopter branch must each emit exactly one `<h1>`.
6. **Form labels:** verify every `<input>`/`<select>`/`<textarea>` is associated with a `<label>` via `htmlFor`.

**Acceptance:**
- New Playwright test using `@axe-core/playwright`: runs axe on `/`, `/animals`, `/login`, `/signup`, `/dashboard` (authed). 0 critical issues.
- Manual keyboard nav: tabbing through `/animals` reaches every interactive element with a visible ring, no traps.
- Coral text contrast checked via browser devtools on each affected element.

**Verify:**
```bash
cd frontend
# Add @axe-core/playwright if missing:
npm i -D @axe-core/playwright
# Add tests/a11y/axe.spec.ts covering the 5 routes
npm run test:e2e -- --grep axe
```

---

## P5 — Animation polish

**Why:** `animate-fade-up` is used inconsistently — sometimes on the page section, sometimes on nested elements. `delay-*` cycling is correct in `AnimalCard` but not standardized elsewhere. Framer-motion's `SuccessCard` doesn't currently honor `useReducedMotion`.

**Files:**
- `src/app/page.tsx`, `src/app/animals/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/about/page.tsx`, `src/app/donate/page.tsx`
- `src/components/ui/success-card.tsx`

**Spec:**

1. **Entry animation rule:** at most ONE `animate-fade-up` per visible viewport. Use it on the topmost section of the page or hero. For lists, use `animate-fade-up delay-${(i % 6) + 1}` on each item (the stagger pattern). Don't put `animate-fade-up` on both a parent section AND its children.
2. **`SuccessCard` reduced-motion:** update to honor `useReducedMotion`:
   ```tsx
   import { motion, useReducedMotion } from "framer-motion";
   const reduceMotion = useReducedMotion();
   const containerVariants = reduceMotion
     ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.01 } } }
     : { hidden: {…}, visible: {… staggerChildren: 0.08 } };
   ```
3. **Audit `delay-*` usage:** anywhere a list maps without `delay-${i%6+1}`, either add the stagger or remove the redundant entry animation (one element doesn't need a stagger).
4. **Don't add page transitions.** Next App Router has no built-in page transitions; adding framer-motion at the layout level is non-trivial and out of scope.

**Acceptance:**
- No nested `animate-fade-up` (parent + child both have it) anywhere — `rg "animate-fade-up"` shows only top-level sections OR cycled list items.
- Setting `prefers-reduced-motion: reduce` in devtools disables both CSS entry animations and framer-motion's `SuccessCard` stagger.
- Visual: animations feel cohesive on `/` and `/animals` — one ripple of motion on load, not a cacophony.

**Verify:**
```bash
cd frontend
rg "animate-fade-up" src/app --type tsx
# Manually inspect: each occurrence should be either (a) a top-level section, OR (b) inside a .map() with delay-${…} class.
npm run build
```

---

## Sequencing notes

- **P0 → P1 → P2 → P3 → P4 → P5** is the recommended order. P0 is independent (small, safe to land first). P1 is also independent. P2 rebuilds the broken support pages and builds the primitives P3 then consolidates around. P4 (a11y) is easiest after P3 because the audit surface is stable. P5 (animation polish) lands last.
- Each task is its own commit. A single PR can bundle related tasks (e.g., P0+P1) but P2 should land in its own PR (touches many files).
- After each task, run `npm run build && npm run lint && npm run test:smoke` before opening PR.

---

## Quick reference card

```
Tokens:        var(--color-*)  var(--shadow-*)  var(--font-*)  var(--max-width-*)
Primitives:    Button, Card, Badge, Eyebrow, ActionLink, SuccessCard
                (+ planned: Skeleton, EmptyState, MobileMenu)
Page shell:    max-w-[var(--max-width-wide)] mx-auto px-4 sm:px-6 pt-20 pb-8
Dynamic:       export const dynamic = "force-dynamic"  on any session/data page
Server fetch:  cache: "no-store"  always
CSRF header:   x-csrf-token  (cookie: ci_csrf)
Auth helpers:  getCurrentSession / getRequiredRoleSession / getRequiredRoleGroupSession
Roles:         "ADOPTER" | "STAFF" | "ADMIN"
Breakpoints:   <640  /  sm: ≥640  /  lg: ≥1024     (md: only when justified)
Grid:          grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6   (default)
Animations:    animate-fade-up, animate-hero-reveal, animate-card-spring-in, delay-1..6
Forbidden:     .ci-*  /  gray-*  /  inline hex  /  client → microservice  /  width in layout.tsx
```
