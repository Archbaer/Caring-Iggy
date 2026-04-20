# Animals Catalog Filters (frontend-only) — Design

Date: 2026-04-20
Owner: Cursor agent
Scope: `frontend/src/app/animals/page.tsx` and `frontend/src/components/animals/*`

## Goal

Copy filter interaction pattern from provided reference (typeahead + selected list with remove + suggestion list with “Add”), adapt to Caring Iggy’s `/animals` catalog.

Key constraint: **backend remains unchanged**. Frontend fetches full animal list each load; filters apply client-side.

## Non-goals

- Changing backend API (`backend/animal-service`) filtering behavior or response payload.
- Adding pagination or server-side search.
- Building a separate “facets” endpoint (option lists) for filters.

## Current state (baseline)

- Catalog page: `frontend/src/app/animals/page.tsx`
- Filter UI: `frontend/src/components/animals/animal-filters.tsx`
- Data fetch: `frontend/src/lib/api/animals.ts` → `GET /api/animals` (animal-service)

Existing URL params (already used by page):

- `status` (single)
- `type` (single)
- `sex` (single)
- `size` (single)

## Target UX

### Filter groups

- **Status**: single-select (chips)
- **Species (type)**: single-select (chips)
- **Sex**: single-select (chips)
- **Size**: **multi-select** picker (reference-style)
- **Race**: **multi-select** picker (reference-style)
  - “Race” maps to existing animal field `breed` (frontend naming only).

### Interaction details (picker)

Picker has:

- Input (placeholder “Add size” / “Add race”)
- Suggestion list below input (shows items not selected; each row has “Add”)
- Selected list with checkmarks + counts, each item removable with “×”
- Keyboard:
  - Arrow up/down moves active suggestion
  - Enter adds active suggestion
  - Backspace on empty input removes last selected
  - Escape closes suggestion list

### URL as state (shareable)

URL remains `/animals` and carries current filter state via query params.

- Single-select:
  - `status=AVAILABLE|PENDING|...`
  - `type=DOG|CAT|...`
  - `sex=MALE|FEMALE|UNKNOWN`
- Multi-select (repeat params):
  - `size=SMALL&size=LARGE`
  - `race=Husky&race=Mix`

Important: **these query params are used for frontend state + client-side filtering only**; backend may ignore unsupported params.

### Options source

- **Size**: fixed list `[SMALL, MEDIUM, LARGE]` (display labels “Small”, “Medium”, “Large”)
- **Race**:
  - Derived from fetched animals list: unique non-empty `breed` strings
  - Sorted (locale compare), case-preserving display

## Data flow

1. Animals page reads `searchParams` and normalizes them:
   - single values (`status`, `type`, `sex`) remain scalar
   - multi values (`size`, `race`) become string arrays
2. Page fetches animal **summaries** list once (unchanged backend call).
3. Page fetches **details** for each listed animal via existing `GET /api/animals/{id}` to obtain fields not present in summary (notably `gender` and `size`).
   - Small dataset assumption makes \(N+1\) acceptable.
   - Implementation should use bounded concurrency to avoid request spikes.
4. Client-side filtering runs on merged “view” list to produce `visibleAnimals`.
5. Filter UI renders:
   - chips for single-select groups
   - picker component(s) for multi-select groups
6. All filter actions update URL (Next `Link` navigation), no local-only hidden state.

## Client-side filtering rules

Given normalized filters:

- If `status` set: keep animals where `animal.status === status`
- If `type` set: keep animals where `animal.animalType === type`
- If `sex` set:
  - Use `animal.gender` from detail payload
- If `size[]` set: keep animals where `animal.size` in `size[]` (detail payload)
- If `race[]` set: keep animals where `animal.breed` in `race[]` (exact match, trimmed)

If a field is absent on an animal (e.g., missing `size` in detail), that animal does not match when that filter is active.

## Components (planned)

- Update `AnimalFilters` to:
  - keep existing chip groups for status/type/sex
  - replace “Size” single-select chips with multi-select picker
  - add “Race” multi-select picker
- Add reusable picker component under `frontend/src/components/animals/filters/`:
  - `MultiSelectFilterPicker` (input + suggestions + selected list)
  - Accepts:
    - `label`
    - `items` (all possible options)
    - `selected` (array)
    - `buildHref(nextSelected)` (returns `/animals?...`)

## Error / empty states

- If `race[]` contains values not present in derived list:
  - still show them as selected (so URL remains authoritative)
  - label them as-is; allow removing
- If derived race list empty:
  - picker shows “No races found” in suggestion list

## Accessibility

- Input has accessible label (visually via section label + `aria-labelledby`)
- Suggestions use `role="listbox"` and items `role="option"` with `aria-selected`
- Keyboard support as described
- Click targets minimum \(44px\) height where feasible (keep density but avoid tiny “×”)

## Testing

- Unit-ish (frontend): pure helper to parse/serialize multi params and apply filter predicate.
- Manual:
  - selecting/removing size + race updates URL correctly
  - reload preserves selections from URL
  - combined filters narrow results correctly
  - “Clear filters” resets to `/animals`

## Open questions (resolved by constraint)

- Backend filtering: explicitly out of scope; frontend-only filtering accepted.

