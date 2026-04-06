# Caring Iggy Frontend + Backend Delta Plan

## 1) Mission
- Build one performant, role-aware web app for Caring Iggy.
- Public: landing, animals list, animal detail.
- Authenticated adopter: dashboard, preferences, interests, best matches.
- Staff/admin: same app/routes, role-gated controls (no separate app).
- Design direction: Vercel-like restraint (white + soft black, minimal chrome, high readability).

## 2) Product Decisions Locked
- Full scope planned now; phased implementation allowed.
- Authn and authz are separate concerns.
- Roles: `ADOPTER`, `STAFF`, `ADMIN`.
- Account creation:
  - Adopters: self-sign up.
  - Staff/Admin: created by admin.
- Permissions:
  - `STAFF`: edit animal data.
  - `ADMIN`: edit animals + adopters + staff accounts.
- "Applied" in v1 == adopter `interestedAnimals`.
- Application status in v1 is derived from animal status.
- Staff edit controls live on `/animals/[id]` only.
- Staff edit UI must be lazy loaded for unauthorized users.
- Keep max 3 interested animals rule.
- Image strategy v1: external image URLs (no upload pipeline in v1).

## 3) Current State Snapshot

### Frontend
- Next.js 16 App Router + React 19 + Tailwind 4.
- Current homepage is unrelated placeholder (`TENMA`).
- No auth/session layer.
- No API client/BFF conventions yet.

### Backend services
- `animal-service` (8081): animal CRUD/list/detail.
- `adopter-service` (8082): adopter CRUD/interests/history.
- `matching-service` (8083): adopter matching endpoint.
- `reporting-service` (8084): summary/intake/adoptions.
- `user-service` (8085): employee CRUD only.

### Critical gaps
- No login/session/password infra.
- No role enforcement.
- No CORS/security policy strategy.
- Matching + reporting internals currently not reliable for intended UX.

## 4) Required Backend Delta (Minimum Viable)

### 4.1 Authn foundation (required)
- Extend `user-service` to support identity/auth:
  - `accounts` table
  - `sessions` table
  - login/logout/session validation endpoints
  - account creation endpoints (self-signup adopter, admin-provision staff/admin)
- Password hashing: bcrypt (store hash only).
- Session token: opaque random secret; store token hash in DB.

### 4.2 Authz foundation (required)
- Enforce role/ownership at server boundary for all mutations.
- Do not rely on UI-only hiding.

### 4.3 Adopter data correctness (required)
- Fix adopter repository hydration for `preferences` (currently selected but not mapped).
- Preserve max-3 interested animals rule (DB + service + UI copy aligned).

### 4.4 Matching reliability (required before matches UI)
- Current issue: matching uses restricted adopter endpoint lacking preferences.
- Current issue: matching expects animal fields not returned by summary list.
- Fix options:
  1) Match by adopter id and fetch full adopter profile.
  2) Provide matching-specific animal payload including needed fields (`animalType`, `breed`, `size`, `temperament`).

### 4.5 Reporting reliability (not phase 1)
- Intake report currently depends on data not present in summary payload.
- Adoption report ignores month semantics.
- Repair backend before shipping report UI.

## 5) Integration Architecture

### Recommended topology
- Browser -> Next app only.
- Next app (server components + route handlers) -> Spring services.
- Keep microservice URLs server-side, not browser-visible.

### Why
- Better security boundary for cookies/session.
- Avoid browser CORS complexity.
- Better SSR performance.
- Cleaner role gating on server.

## 6) Authn/Authz Model

### Identity link model
- Account role + profile linkage:
  - `ADOPTER` linked to adopter profile id.
  - `STAFF`/`ADMIN` linked to employee profile id.

### Session model
- Cookie flags: `HttpOnly`, `SameSite=Lax`, `Secure` in non-local.
- Session verification performed server-side.

### Authorization matrix
- `PUBLIC`:
  - `/`, `/animals`, `/animals/[id]`, `/login`, `/signup`
- `ADOPTER`:
  - public routes + own dashboard/preferences/interests/matches
  - can update own preferences/interests only
- `STAFF`:
  - adopter permissions not required
  - can edit animal data
- `ADMIN`:
  - staff permissions + adopter management + staff account management

## 7) Route Plan (Frontend)

### Public
- `/`
- `/animals`
- `/animals/[id]`
- `/login`
- `/signup`

### Authenticated
- `/dashboard`
- `/dashboard/preferences`
- `/dashboard/interests`
- `/dashboard/matches`

### Admin
- `/dashboard/admin/adopters`
- `/dashboard/admin/adopters/[id]`
- `/dashboard/admin/staff`
- `/dashboard/admin/staff/[id]`

## 8) BFF/API Route Plan (Next Route Handlers)
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/signup`
- `/api/auth/session`
- `/api/adopter/preferences`
- `/api/adopter/interests`
- `/api/animals/create`
- `/api/animals/[id]/edit`
- `/api/animals/[id]/delete`
- `/api/admin/adopters/*`
- `/api/admin/staff/*`

## 9) UI/UX Plan by Page

### `/` Landing
- Replace placeholder with Caring Iggy narrative:
  - Hero
  - Mission/trust
  - Featured animals
  - Adoption process
  - CTA to `/animals`
- Style: white base, graphite text, minimal accent, subtle motion.

### `/animals`
- Grid of lightweight cards:
  - image
  - name
  - type
  - breed
  - status
- Filters via existing params (`status`, `type`).
- SSR by default.

### `/animals/[id]`
- Centered full detail card.
- Public: full readable details.
- Adopter: interest action(s).
- Staff/Admin: lazy-loaded edit controls.

### `/dashboard` (Adopter)
- Snapshot blocks:
  - interested animals count (max 3)
  - preferences summary
  - best matches (after matching fix)

### `/dashboard/preferences`
- Edit preference fields used by matching.

### `/dashboard/interests`
- Show interested animals and derived statuses.

### `/dashboard/matches`
- Enabled after matching backend fix.

### Admin pages
- Adopter management.
- Staff account management.

## 10) Derived Application Status Mapping (v1)
- `AVAILABLE` -> `Open for Adoption`
- `PENDING` -> `Pending`
- `ADOPTED` -> `Adopted`
- `IN_TREATMENT` -> `In Care`
- `DECEASED` -> `Archived`

Notes:
- Do not present fake workflow states (approved/rejected) since there is no real application entity in v1.

## 11) Lazy-Load Strategy for Staff Edit UI
- Animal detail page remains server-rendered.
- Determine role server-side.
- Only for `STAFF`/`ADMIN`, render edit entrypoint.
- Editor chunk loaded dynamically on demand.
- Public/adopter bundle does not include editor logic.

## 12) Performance Plan (Non-Negotiable)
- Prefer server components for reads.
- Client components only where interaction requires it.
- Keep dependencies minimal; no heavy state libs initially.
- Mutations through BFF route handlers.
- Tag/path revalidation on mutations.
- Use `next/image` with explicit sizes.
- Keep CSS tokenized and small.

## 13) Image URL Plan
- v1: use external image URLs (license-safe, stable sources).
- Add remote image domain allowlist in Next config.
- Add fallback placeholders for broken URLs.
- Later: migrate to owned storage/CDN if needed.

Suggested skill for image discovery:
- `brave/brave-search-skills@images-search`

## 14) Data/Type Plan
- Define shared frontend types matching backend DTOs.
- Normalize enums at boundaries.
- Create thin `lib/api` wrappers per service resource.
- Centralize status display mapping in one utility.

## 15) Error Handling Plan
- Standardize API error shape at BFF boundary.
- Inline form validation errors.
- Friendly empty/error states for list/detail/dashboard.
- Distinguish authn failure (401) vs authz failure (403).

## 16) Security Baseline
- Hash passwords with bcrypt.
- HTTP-only sessions.
- CSRF protection for mutating BFF endpoints.
- Role + ownership checks on every mutation route.
- Rate limit auth endpoints (login/signup).
- Avoid exposing internal service URLs to browser.

## 17) Phase Plan

### Phase 0: Foundation Decisions (done)
- Scope and role model confirmed.

### Phase 1: Public Core (first ship)
- Landing page
- Animals list
- Animal detail (public)
- Design system baseline

### Phase 2: Auth Foundation
- Backend account/session model
- Login/signup/logout/session
- Route protection and role context

### Phase 3: Adopter Product
- Dashboard/preferences/interests
- Interest updates (max 3 enforced)
- Derived status UX

### Phase 4: Staff/Admin Controls
- Staff/admin edit on `/animals/[id]` (lazy-loaded)
- Admin adopter management
- Admin staff account management

### Phase 5: Matching + Reporting Completion
- Matching backend fixes + matches UI
- Reporting backend fixes + admin reporting UI

### Phase 6: Hardening
- a11y, perf, edge cases, observability, polish

## 18) Acceptance Criteria by Phase

### Phase 1
- Domain-correct landing and animal browsing UX.
- Mobile/desktop responsive and fast.

### Phase 2
- Secure login/session works for all roles.
- Unauthorized access blocked correctly.

### Phase 3
- Adopter can manage preferences/interests.
- Interested animals capped at 3 in UI + backend.

### Phase 4
- Staff/admin edit controls appear only when authorized.
- Unauthorized users do not download or see edit UI.

### Phase 5
- Matches are preference-driven and correct.
- Reports reflect correct month-based metrics.

## 19) Risks + Mitigations
- Risk: matching logic currently inconsistent.
  - Mitigation: backend repair before enabling matches UI.
- Risk: reporting endpoints currently inaccurate for month analytics.
  - Mitigation: postpone reports UI until backend fix.
- Risk: external image URLs may rot.
  - Mitigation: domain allowlist + fallbacks; later image mirroring.
- Risk: role mistakes can expose mutation actions.
  - Mitigation: server-side authz checks in every BFF mutation.

## 20) Immediate Next Execution Order (when implementation starts)
1. Replace placeholder frontend with domain-accurate landing + animal browse/detail.
2. Add Next BFF scaffolding and typed API client layer.
3. Implement auth backend delta (`accounts`, `sessions`, auth endpoints).
4. Implement login/signup + session guards.
5. Build adopter dashboard (preferences/interests/status).
6. Build staff/admin controls and lazy-loaded animal editor.
7. Repair matching, then ship matches page.
8. Repair reporting, then ship admin reports page.
