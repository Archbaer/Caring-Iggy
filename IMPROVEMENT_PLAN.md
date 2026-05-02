# Frontend Improvement Plan

## Audit Date: 2026-05-02

---

## 1. Orphan Pages (no nav link, potentially dead)

| Route | File |
|---|---|
| `/animals/[id]` | `frontend/src/app/animals/[id]/page.tsx` |
| `/animals/[id]/edit` | `frontend/src/app/animals/[id]/edit/page.tsx` |
| `/dashboard/admin` | `frontend/src/app/dashboard/admin/page.tsx` |
| `/dashboard/admin/adopters` | `frontend/src/app/dashboard/admin/adopters/page.tsx` |
| `/dashboard/admin/adopters/[id]` | `frontend/src/app/dashboard/admin/adopters/[id]/page.tsx` |
| `/dashboard/admin/staff` | `frontend/src/app/dashboard/admin/staff/page.tsx` |
| `/dashboard/admin/staff/[id]` | `frontend/src/app/dashboard/admin/staff/[id]/page.tsx` |
| `/dashboard/animals/new` | `frontend/src/app/dashboard/animals/new/page.tsx` |

---

## 2. Duplicated Functions (extract to shared utilities)

| Function | Occurrences |
|---|---|
| `readQueryValue` | `login/page.tsx`, `signup/page.tsx`, `animals/page.tsx` |
| `handleMutationError` | `animal-creator.tsx`, `animal-editor.tsx` |
| `toEditorMessage` | `animal-creator.tsx`, `animal-editor.tsx` |
| `readErrorMessage` | `animal-creator.tsx`, `animal-editor.tsx` |
| `refreshCsrfToken` / `refreshCsrfTokenImpl` | 8 files: `animal-creator.tsx`, `animal-editor.tsx`, `preferences-form.tsx`, `interests-manager.tsx`, `login-form.tsx`, `signup-form.tsx`, `staff-detail-client.tsx`, `staff-edit-panel.tsx`, `adopter-edit-panel.tsx` |

**Major overlap:** `animal-creator.tsx` (482L) + `animal-editor.tsx` (365L) share ~16 identical form input blocks, shared enums (`STATUS_OPTIONS`, `GENDER_OPTIONS`, `SIZE_OPTIONS`), and identical form state types.

---

## 3. Dead Code / Orphan Files (never imported)

- `components/ui/section-heading.tsx`
- `components/ui/stat-card.tsx`
- `components/animals/animal-detail.tsx` — zero imports found, but uses 9 `.ci-*` classes. **Decision needed:** delete (removes CSS violations for free) or keep (if intended for future use).
- `components/animals/filters/ChipGroup.tsx`
- `components/animals/filters/FilterGroup.tsx`
- `components/animals/filters/MultiSelectFilterPicker.tsx`

**VERIFIED LIVE — `lib/constants/config.ts` is imported by `lib/api/client.ts` for BFF API URLs. Do NOT delete.**

**Unused variables:**
- `adopter-edit-panel.tsx:L34` — `csrfToken`
- `staff-edit-panel.tsx:L30` — `csrfToken`
- `login-form.tsx:L17` — `searchParams`
- `signup-form.tsx:L21` — `searchParams`
- `interests-manager.tsx:L34` — `csrfToken`
- `public-header.tsx:L74` — mobile `<button>` lacks `onClick`

---

## 4. Performance Issues

**Double footer renders:**
- `app/donate/page.tsx:L121` — duplicate `<PublicFooter />` (already in `layout.tsx`)
- `app/dashboard/matches/page.tsx:L35` — duplicate `<PublicFooter />`

**Large files (>300 lines):**
- `lib/auth/server.ts` — 833L
- `components/animals/animal-creator.tsx` — 482L
- `lib/api/admin.ts` — 479L
- `components/dashboard/preferences-form.tsx` — 431L
- `components/animals/animal-editor.tsx` — 365L
- `app/page.tsx` — 343L
- `components/auth/signup-form.tsx` — 304L

**73 inline arrow functions in JSX** — hotspots in forms and editors.

**Missing memoization:**
- `interests-manager.tsx` — `dedupedCurrent`, `dedupedCatalog`, `initialIds` recompute every render
- `interests-manager.tsx` — `availableAnimals` filter not memoized

**Repeated API pattern:** CSRF session fetch duplicated across 8 client components.

---

## 5. Global CSS Class Violations (`.ci-*` banned)

**76 occurrences across 16 files.** Heaviest offenders:

| File | Count | Key classes |
|---|---|---|
| `app/donate/page.tsx` | 16 | `ci-section`, `ci-card`, `ci-btn`, `ci-h1`, `ci-h3`, `ci-body`, `ci-body-lg`, `ci-cta-band` |
| `app/page.tsx` | 9 | `ci-hero-reveal`, `ci-hero-image-reveal`, `ci-trust-bar-reveal`, `ci-btn` |
| `components/animals/animal-detail.tsx` | 9 | `ci-h1`, `ci-h3`, `ci-body`, `ci-body-lg` |
| `app/about/page.tsx` | 7 | `ci-hero-reveal`, `ci-hero-image-reveal`, `ci-btn` |
| `components/admin/staff-detail-client.tsx` | 5 | `ci-badge`, `ci-btn` |
| `components/ui/stat-card.tsx` | 5 | `ci-stat-card`, `ci-stat-icon-badge` |
| `app/layout.tsx` | 3 | `ci-body`, `ci-frame`, `ci-main` (structural — affects every page) |
| `app/login/page.tsx` | 1 | `ci-hero-reveal` |
| `app/signup/page.tsx` | 1 | `ci-hero-reveal` |
| `components/auth/login-form.tsx` | 1 | `ci-btn` |
| `components/auth/signup-form.tsx` | 1 | `ci-btn` |
| `components/dashboard/preferences-form.tsx` | 1 | `ci-btn` |
| `components/admin/staff-edit-panel.tsx` | 2 | `ci-btn` |
| `components/admin/adopter-edit-panel.tsx` | 2 | `ci-btn` |
| `components/admin/adopter-detail-client.tsx` | 2 | `ci-badge`, `ci-btn` |
| `app/dashboard/matches/page.tsx` | 2 | `ci-btn` |

**Class categories:**
- **Layout/structural:** `ci-body`, `ci-frame`, `ci-main` (in `layout.tsx` — affects every page)
- **Animation:** `ci-hero-reveal`, `ci-hero-image-reveal`, `ci-trust-bar-reveal` (CSS animation triggers)
- **Typography:** `ci-h1`, `ci-h3`, `ci-body`, `ci-body-lg`, `ci-section__eyebrow`, `ci-section__title`
- **Components:** `ci-card`, `ci-btn` (with variants `--primary`, `--ghost`, `--white`, `--secondary`, `--danger`, `--lg`), `ci-badge`, `ci-stat-card`, `ci-stat-icon-badge`
- **Sections:** `ci-section`, `ci-section--warm`, `ci-section__inner`, `ci-section__header`, `ci-cta-band`, `ci-cta-band__title`, `ci-cta-band__subtitle`

**Existing precedent:** `components/ui/eyebrow.tsx` (line 10-11) documents itself as "Single source of truth replacing ci-label, ci-section__eyebrow, ci-hero__eyebrow." Follow this pattern — create React components, not just class swaps.

---

## 6. Lint / Accessibility Violations

| File | Issue |
|---|---|
| `app/about/page.tsx:L114,117` | Unescaped `'` |
| `app/dashboard/admin/staff/[id]/page.tsx:L34` | `<a>` for internal nav (use `<Link>`) |
| `app/dashboard/matches/page.tsx:L29,30` | `<a>` for internal nav |
| `components/admin/adopter-detail-client.tsx:L42` | `<a>` for internal nav |
| `components/admin/staff-detail-client.tsx:L78` | `<a>` for internal nav |
| `components/animals/filters/MultiSelectFilterPicker.tsx:L127` | Invalid `aria-expanded` on `textbox` role |

---

## 7. Next.js Middleware Deprecation

⚠️ **DEFERRED:** The `npx @next/codemod@canary middleware-to-proxy` codemod does not exist as of Next.js 16.2.2. The 'middleware' convention is a soft deprecation — it still works and is renamed internally. Defer this migration until Next.js officially documents the proxy migration path.

`frontend/src/middleware.ts` — uses deprecated `middleware` convention. Migrate to `proxy` convention per Next.js docs.

---

## Recommendations Pending

Awaiting research and best-practice review.

---

## 1. Orphan Pages — Recommendations

### Codebase findings
- `/animals/[id]` **is linked** from `components/animals/animal-card.tsx` (lines 56, 77, 87) and `components/dashboard/interests-manager.tsx` (line 124).
- `/animals/[id]/edit` **is linked** from `components/animals/animal-card.tsx` (line 94) when `canEdit` is true.
- `/dashboard/admin` **is the ADMIN redirect target** from `app/dashboard/page.tsx` (line 24) and is the root admin workspace.
- `/dashboard/admin/adopters` **is linked** from `app/dashboard/admin/page.tsx` (line 69).
- `/dashboard/admin/staff` **is linked** from `app/dashboard/admin/page.tsx` (line 86).
- `/dashboard/animals/new` **is linked** from `app/dashboard/page.tsx` (line 56) and `app/dashboard/admin/page.tsx` (line 106).

### Best practice
Per Next.js routing conventions, a page is only a true "orphan" if it has **zero internal links** and receives no organic traffic. Most routes listed here are reachable via role-based dashboards or card grids. The correct action is **not deletion** but ensuring discoverability:

1. **Keep as direct-URL entry points** — detail pages (`[id]`, `[id]/edit`) are reached from list/grid UIs. This is standard App Router patterns.
2. **Verify back-links exist** — Ensure every list view links to its detail view. If `dashboard/admin/adopters/page.tsx` renders a table, each row must link to `/dashboard/admin/adopters/[id]`. If missing, add an `ActionLink` or `Link` in the list cell.
3. **Add to sitemap** — If any page is intentionally unlinked (e.g., a hidden staff tool), declare it in `app/sitemap.ts` so crawlers and audits acknowledge it.
4. **Do not delete** `/dashboard/admin` sub-routes or `/animals/[id]` routes; they are functional endpoints in a CRUD flow.

---

## 2. Duplicated Functions — Recommendations

### Extraction strategy
Next.js projects should place shared, framework-agnostic utilities under `lib/utils/` or `lib/shared/`. For data-access helpers, co-locate them next to the API client (`lib/api/`). Use **direct file imports** instead of barrel files (`index.ts`) for tree-shaking health.

### Concrete steps

**A. `readQueryValue` (3 occurrences)**
- **Create** `frontend/src/lib/utils/url.ts`:
  ```ts
  export function readQueryValue(value?: string | string[]): string | undefined {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  }
  ```
- **Replace** inline definitions in:
  - `app/login/page.tsx`
  - `app/signup/page.tsx`
  - `app/animals/page.tsx`

**B. Form error helpers (`handleMutationError`, `toEditorMessage`, `readErrorMessage`)**
- **Move** these three functions to `frontend/src/lib/api/animal-editor-client.ts` (or a new `lib/utils/animal-editor.ts`).
- **Import** them in both `components/animals/animal-creator.tsx` and `components/animals/animal-editor.tsx`.
- Remove the duplicate `toEditorMessage` and `readErrorMessage` from both files.

**C. `refreshCsrfToken` / `refreshCsrfTokenImpl` (9 occurrences across 8 files)**
- **Move** to `frontend/src/lib/api/auth.ts` (which already exports `fetchAuthSession`):
  ```ts
  export async function refreshCsrfToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.csrfToken;
    } catch {
      return null;
    }
  }
  ```
- **Import** in all 8 files:
  - `components/animals/animal-creator.tsx`
  - `components/animals/animal-editor.tsx`
  - `components/dashboard/preferences-form.tsx`
  - `components/dashboard/interests-manager.tsx`
  - `components/auth/login-form.tsx`
  - `components/auth/signup-form.tsx`
  - `components/admin/staff-detail-client.tsx`
  - `components/admin/staff-edit-panel.tsx`
  - `components/admin/adopter-edit-panel.tsx`

**D. Shared form state between creator & editor**
- The 16 identical input blocks and shared enums (`STATUS_OPTIONS`, `GENDER_OPTIONS`, `SIZE_OPTIONS`) should be extracted into:
  1. `lib/constants/animal-options.ts` — export the three enums.
  2. `components/animals/animal-form-fields.tsx` — a **presentational-only** Client Component that accepts `formState`, `onChange`, and optional `readOnly` props. Do NOT extract state management — creator and editor have different mutation flows (create vs update), different error handling, and different initial states. Only the visual form fields are shared.
  3. Optionally, a `useAnimalFormState(initialData)` hook in `components/animals/use-animal-form.ts` to own the `useState` logic.

---

## 3. Dead Code / Orphan Files — Recommendations

### Detection tools
| Tool | Use case | Command |
|---|---|---|
| **Knip** (recommended) | Unused files, exports, dependencies. Has a Next.js plugin. | `npx knip` |
| **ts-prune** | Unused TypeScript exports only. | `npx ts-prune` |
| **depcheck** | Unused npm dependencies. | `npx depcheck` |

**Recommendation:** Run `npx knip --include files,exports` to generate a report. Knip correctly understands Next.js entry points (`page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`) and won't false-positive them.

### Safe deletion protocol
1. Run `npx knip` and review the output.
2. For each flagged file/export, run `grep -r "from ['\"].*filename['\"]" src/` to confirm zero imports.
3. Delete the file (or remove the export).
4. Run `npm run build` (or `next build`). If it passes, the deletion is safe.
5. Commit individually so rollbacks are easy.

### Specific actions for the listed dead code
- `components/ui/section-heading.tsx` — delete. Zero imports found.
- `components/ui/stat-card.tsx` — delete. Zero imports found.
- `lib/constants/config.ts` — **VERIFIED LIVE**, imported by `lib/api/client.ts`. Do NOT delete.
- `components/animals/animal-detail.tsx` — zero imports found. **Decision needed:** delete (removes 9 `.ci-*` usages for free) or keep (if intended for future use). If keeping, add to a route or remove from dead code list.
- `components/animals/filters/ChipGroup.tsx`, `MultiSelectFilterPicker.tsx`, `FilterGroup.tsx` — delete these three files only. Keep `FilterChip.tsx` and `FilterPill.tsx` — actively imported by `animal-filters.tsx`. **Rewrite `filters/index.ts`** to export only `FilterChip` and `FilterPill` (remove `FilterGroup`, `ChipGroup`, `MultiSelectFilterPicker` exports).

### Unused variables (safe to remove now)
- `adopter-edit-panel.tsx:L34` — `csrfToken` state is set but never read.
- `staff-edit-panel.tsx:L30` — same pattern.
- `login-form.tsx:L17` — `searchParams` from `useSearchParams()` is unused.
- `signup-form.tsx:L21` — `searchParams` from `useSearchParams()` is unused.
- `interests-manager.tsx:L34` — `csrfToken` state is set but never read.
- `public-header.tsx:L74` — mobile button lacks `onClick`. Add `disabled aria-disabled` or implement handler.

---

## 4. Performance Issues — Recommendations

### Server Components vs Client Components
- **Default to Server Components** for data fetching and static UI. Only add `"use client"` when you need state, effects, or browser APIs.
- **Current issue:** `app/animals/page.tsx` is a Server Component but performs heavy client-side logic: it fetches ALL animals, then batches `fetchAnimalForView` in chunks of 5 to get gender/size/breed for filtering. This should be moved to the server so the client receives already-filtered data.

### Concrete fixes

**A. Remove duplicate footers** (note: `PublicFooter` is an async Server Component — no client perf cost, just unnecessary HTML duplication)
- `app/donate/page.tsx:L121` — remove `<PublicFooter />` (already rendered in `app/layout.tsx:L54`).
- `app/dashboard/matches/page.tsx:L35` — remove `<PublicFooter />`.

**B. Memoize expensive derivations in `interests-manager.tsx`**
```tsx
const dedupedCurrent = useMemo(() => Array.from(
  new Map(rawCurrentAnimals.map((a) => [a.id, a])).values()
), [rawCurrentAnimals]);

const dedupedCatalog = useMemo(() => Array.from(
  new Map(rawCatalogAnimals.map((a) => [a.id, a])).values()
), [rawCatalogAnimals]);

const initialIds = useMemo(() => Array.from(new Set(dedupedCurrent.map((a) => a.id))), [dedupedCurrent]);

const availableAnimals = useMemo(() => dedupedCatalog.filter(
  (animal) => !selectedIds.includes(animal.id) && animal.status === "AVAILABLE"
), [dedupedCatalog, selectedIds]);
```

**C. Split oversized components**
- `animal-creator.tsx` (482L) and `animal-editor.tsx` (365L): extract `AnimalFormFields` presentational component (see Section 2). Target: creator <250L, editor <250L.

**D. Inline arrow functions — 73 in JSX**
- Fix priority: if passed to a `memo` child, wrap in `useCallback`. Otherwise, extract as named function for readability.

**E. Deduplicate CSRF session fetch — 8 components**
- **Option 1 (simplest):** Create a `useCsrfToken()` hook in `lib/hooks/use-csrf-token.ts` that fetches once and caches.
- **Option 2 (best long-term):** Migrate mutations to Next.js **Server Actions** (`"use server"`). Server Actions receive the session automatically; no client-side CSRF fetch required.

---

## 5. Global CSS Class Violations — Recommendations

### Tailwind migration strategy
The project already uses Tailwind CSS v4. Migration should be **component-by-component**.

1. **Replace `.ci-*` with Tailwind utilities:**
   - Example: `.ci-card` → `rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[var(--shadow-card-hover)]`.
   - Example: `.ci-btn--primary` → `inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-semibold px-6 py-3 hover:bg-[var(--color-primary-deep)] transition-all duration-200`.

2. **Heaviest offenders to tackle first:** `app/donate/page.tsx` (16), `app/page.tsx` (9), `components/animals/animal-detail.tsx` (9), `app/about/page.tsx` (7), `app/layout.tsx` (3 — structural, affects every page).

3. **Follow the `eyebrow.tsx` pattern:** `components/ui/eyebrow.tsx` already replaces `.ci-label`, `.ci-section__eyebrow`, `.ci-hero__eyebrow` with a React component. For recurring patterns like `ci-btn`, `ci-card`, `ci-section`, create React components (`<Button>`, `<Card>`, `<Section>`) rather than just swapping class names. This is the project's established convention.

4. **After a class is fully removed from all TSX files, delete it from `globals.css`.**

### Design tokens
- **Current approach** (`:root` CSS variables) is valid for Tailwind v4.
- **Improvement:** Register custom properties in `@theme inline` so you can use `bg-primary` instead of `bg-[var(--color-primary)]`.
- **Do not** create `.ci-card`, `.ci-section` global classes. If a pattern repeats, create a **React component** (`Card`, `Section`) or use Tailwind's `@layer components`.

---

## 6. Lint / Accessibility Violations — Recommendations

### `<a>` vs `<Link>` for internal navigation
- `app/dashboard/admin/staff/[id]/page.tsx:L34` — change `<a href="/dashboard/admin/staff">` to `<Link>`.
- `app/dashboard/matches/page.tsx:L29,30` — change both `<a>` to `<Link>`.
- `components/admin/adopter-detail-client.tsx:L42` — change `<a>` to `<Link>`.
- `components/admin/staff-detail-client.tsx:L78` — change `<a>` to `<Link>`.
- `components/layout/public-footer.tsx:L101,117` — internal links (`/animals`, `/about`, `/donate`, `/dashboard/*`) use `<a href>`. Change to `<Link>`.

### Other fixes
- `app/about/page.tsx:L114,117` — unescaped quotes. Use `&apos;` or `&rsquo;`.
- `components/animals/filters/MultiSelectFilterPicker.tsx:L127` — `aria-expanded` invalid on `textbox` role. Add `role="combobox"` to the element.
- `components/layout/public-header.tsx:L74` — mobile hamburger button has no `onClick`. Add handler or `disabled aria-disabled` with TODO.

---

## 7. Next.js Middleware Deprecation — Recommendations

⚠️ **DEFERRED:** The `npx @next/codemod@canary middleware-to-proxy` codemod does not exist as of Next.js 16.2.2. The 'middleware' convention is a soft deprecation — it still works and is renamed internally. Defer this migration until Next.js officially documents the proxy migration path.

### Migration: `middleware.ts` → `proxy.ts`

1. **Run official codemod (recommended):**
   ```bash
   cd frontend
   npx @next/codemod@canary middleware-to-proxy .
   ```
   This renames `src/middleware.ts` → `src/proxy.ts` and `export function middleware` → `export function proxy`.

2. **Manual steps if codemod unavailable:**
   - Rename `frontend/src/middleware.ts` → `frontend/src/proxy.ts`.
   - Change line 12: `export async function middleware(` → `export async function proxy(`.
   - Keep `export const config = { matcher: [...] }` unchanged.

3. **Post-migration verification:**
   - Run `next build` — ensure no "middleware" warning appears.
   - Test protected routes: `/dashboard`, `/login`, `/signup` confirm redirects work.

---

## 8. Seceng Review Notes

### Critical corrections applied
- `lib/constants/config.ts` removed from dead code list (live dependency of `lib/api/client.ts`)
- `filters/` directory recommendation corrected — keep `FilterChip` + `FilterPill`, delete only `ChipGroup`, `MultiSelectFilterPicker`, `FilterGroup`. Explicitly rewrite `filters/index.ts` to export only `FilterChip` and `FilterPill`.
- Middleware migration deferred — codemod doesn't exist, convention still works
- `refreshCsrfToken` count corrected from 3 → 9 occurrences across 8 files
- `animal-detail.tsx` flagged for decision: delete (removes 9 `.ci-*` usages) or keep (if future-use)
- §5 `.ci-*` count updated from "15 files" to "76 occurrences across 16 files" with full class category breakdown
- §6 `public-footer.tsx` internal `<a>` links added to accessibility violations
- §4A `PublicFooter` noted as async Server Component (no client perf cost, just HTML duplication)
- §2D AnimalFormFields extraction clarified as presentational-only (not state management)

### Missing areas (for future audit cycles)
- **Security audit** — CSRF token handling, auth middleware bypass paths, BFF input validation
- **Dependency audit** — `npm audit`, outdated packages, supply chain risk
- **Test coverage** — No integration tests for animal create/edit flows that this plan refactors
- **Homepage performance** — `app/page.tsx` (343L) is high-traffic, needs specific optimization plan
- **Auth module** — `lib/auth/server.ts` (833L) is a large security surface area, needs review

### Implementation safety rules
1. Always `grep -r` to confirm zero imports before deleting ANY file
2. Run `next build` after each batch of changes
3. Commit individually per change for easy rollback
4. Write integration tests before the AnimalFormFields extraction (Section 2D)
