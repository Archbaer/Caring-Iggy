# Animals UI Fixes — Design Spec
*2026-05-30*

## Scope
Two pages (`/animals`, `/animals/[id]`), one backend DTO, and Next.js caching. Four problems to fix.

---

## 1. Filter Bug — Size & Breed (animals listing page)

**Problem:** `MultiChipRow` buttons call `buildHref(next)` inside `onClick` but discard the return value — no navigation occurs. Size and Breed filters are completely non-functional.

**Fix:** Replace `<button onClick={() => buildHref(next)}>` with `<Link href={buildHref(next)}>`, styled identically. Same pattern as `FilterChip` and `FilterPill`.

No other changes to `AnimalFilters` props or defaults.

---

## 2. Image Standardization (animal detail page)

**Problem:** `AnimalImage` in the detail view has no height constraint — tall images dominate the screen, small images look broken.

**Fix:** Wrap the image container in a fixed-dimension frame: `w-[480px] h-[380px]` on desktop, `w-full aspect-[4/3]` on mobile. Image fills frame via `object-cover`. Placeholder fills same frame.

---

## 3. Detail Page Layout Redesign (`/animals/[id]`)

### Hero section (above the fold)
Two-column grid: `480px` fixed image column left, `1fr` right column. Single column on mobile.

Right column contains stacked cards (top-down):
- **Name + badge** — status badge, animal name, breed·type·age subtitle (not in a card, just header)
- **Details card** — breed, type, age, sex, size, status, intake date (all available fields, skip if null)
- **Temperament card** — shown only if `animal.temperament` exists
- **About card** — description text; fallback text if none

### Below hero
- **Previous owner section** — shown only if `animal.previousOwner` exists. Label "Previous owner" above a responsive card grid: Name, Telephone, Email (optional), Address (optional).
- **"I'm interested" button** — full-width centered container, `RegisterInterestButton` centered inside. No emoji.

### Remove
- Standalone `<About {animal.name}>` heading + paragraph block (moves into About card)
- `<DetailPanel>` grid below the hero (moves into right-col cards)

### Responsive
- Mobile (`< 640px`): single column, image `w-full aspect-[4/3]`, cards stack below
- Desktop (`≥ 640px`): `480px` fixed image + `1fr` right column

---

## 4. Eliminate N+1 fetches + Next.js caching

### Phase A — Enrich `AnimalSummaryDto` (backend)

**Problem:** `GET /api/animals` returns summaries without `size` or `gender` — the listing page must call `GET /api/animals/{id}` for every animal just to filter. 100 animals = 101 calls per render.

**Fix:** Add `size` and `gender` to `AnimalSummaryDto`. `toSummaryDto()` in `AnimalService` already has the `Animal` entity — just map the two extra fields.

```java
// AnimalSummaryDto — add:
private AnimalGender gender;
private AnimalSize size;
```

Frontend `fetchAnimals()` response now includes `size` and `gender` — the listing page drops all `fetchAnimalForView()` calls entirely.

Result: **N+1 calls → 1 call** on every render.

### Phase B — Next.js Data Cache with `revalidateTag` (frontend)

Tag the `fetchAnimals()` fetch so Next.js caches the response server-side, shared across all users:

```ts
// lib/api/animals.ts — fetchAnimals()
fetch(url, { next: { tags: ['animals'] } })
```

Invalidate on every mutation — create, update, delete — by calling `revalidateTag('animals')` in the three Next.js API routes that mutate animal data:

| Route | Trigger |
|---|---|
| `app/api/animals/create/route.ts` | POST succeeds |
| `app/api/animals/[id]/edit/route.ts` | PUT succeeds |
| `app/api/animals/[id]/delete/route.ts` | DELETE succeeds |

**Behavior:**
- Staff creates/edits/deletes an animal → cache cleared immediately → next user sees fresh data
- No stale window — invalidation is event-driven, not time-based
- Cache is server-side (Next.js Data Cache), not browser — shared across all users

---

## Files changed

| File | Change |
|---|---|
| `backend/.../dto/AnimalSummaryDto.java` | Add `gender`, `size` fields |
| `backend/.../service/AnimalService.java` | Map `gender`, `size` in `toSummaryDto()` |
| `frontend/src/lib/api/animals.ts` | Add `{ next: { tags: ['animals'] } }` to `fetchAnimals()` fetch |
| `frontend/src/app/animals/page.tsx` | Remove N+1 detail fetches; filter using enriched summary |
| `frontend/src/app/api/animals/create/route.ts` | Add `revalidateTag('animals')` on success |
| `frontend/src/app/api/animals/[id]/edit/route.ts` | Add `revalidateTag('animals')` on success |
| `frontend/src/app/api/animals/[id]/delete/route.ts` | Add `revalidateTag('animals')` on success |
| `frontend/src/components/animals/animal-filters.tsx` | `MultiChipRow` button → `<Link>` |
| `frontend/src/app/animals/[id]/page.tsx` | Full layout restructure |

---

## Out of scope
- No changes to filter logic beyond the navigation fix
- No changes to the editor slot (staff/admin controls)
- No changes to the listing page card grid
- No Redis (deferred — not needed once N+1 is fixed)
