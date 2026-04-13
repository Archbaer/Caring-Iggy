# F3 Signup Verification Remediation Plan

## TL;DR
> **Summary**: Resolve the recurring F3 signup blocker with a hard-gated verification ladder that proves each layer before escalating to browser QA. The implementer must not rerun full Playwright until compose, backend, and BFF signup smoke are all green.
> **Deliverables**:
> - Stable local backend runtime on Docker Compose
> - Deterministic frontend runtime with explicit backend env
> - Passing `/api/auth/session` and `/api/auth/signup` smoke flow
> - Passing F3 browser scenario with unique-email signup
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: 1 → 2 → 3 → 4 → 5 → 6

## Context
### Original Request
Create a detailed, optimized approach for solving the repeated F3 signup verification failure without wasting tokens on repeated long loops.

### Interview Summary
- The failure pattern is known: unique-email signup cascades into repeated F3 rejection.
- Previous execution wasted time by re-running top-level verification before prerequisites were stable.
- The plan must prioritize deterministic isolation and minimize retries.

### Metis Review (gaps addressed)
- Added hard stage gates so full browser QA cannot run against a broken lower layer.
- Added retry policy: retry transient network/boot issues once; do not retry deterministic assertion failures.
- Added stale-runtime controls: one frontend PID, one port, explicit env, clean browser state, unique email per run.

## Work Objectives
### Core Objective
Make F3 pass by fixing the signup path in the smallest failing layer first, then promoting verification upward only after lower layers are proven green.

### Deliverables
- Compose runtime checklist for required services and ports
- Backend signup-path checklist (`user-service` -> `adopter-service`)
- Frontend BFF session/signup smoke checklist
- Final browser F3 verification checklist

### Definition of Done
- `docker compose -f infrastructure/docker-compose.yml up -d` starts healthy services needed by signup.
- `curl http://127.0.0.1:3010/api/auth/session` returns `200` and a CSRF token.
- `POST http://127.0.0.1:3010/api/auth/signup` with unique email returns success (not 5xx/502).
- Browser F3 completes: redirect to login, signup succeeds, matches page shows coming-soon state, adopter cannot access admin route.

### Must Have
- Single deterministic frontend runtime for all verification (`3010` recommended)
- Explicit env for `ANIMAL_SERVICE_URL`, `ADOPTER_SERVICE_URL`, `USER_SERVICE_URL`
- Unique signup email per run
- Clean browser storage/cookies before each F3 attempt
- No full Playwright rerun before lower gate success

### Must NOT Have
- No repeated blind Playwright retries
- No stale `next dev` process ambiguity
- No mixed infra/backend/frontend fixes in one unverifiable batch
- No retries of deterministic failures without a code/config change

## Verification Strategy
- Test decision: tests-after, gated by smallest failing layer first
- QA policy: each stage must pass before the next begins
- Retry policy:
  - transient boot/network: max 1 retry after evidence capture
  - deterministic 4xx/5xx/assertion mismatch: 0 retries until fix is applied

## Execution Strategy
### Ordered Gates
1. **Runtime Gate** — prove compose services and ports are healthy
2. **Session Gate** — prove frontend `/api/auth/session` works on one clean runtime
3. **Signup API Gate** — prove `/api/auth/signup` succeeds through BFF with unique email
4. **Cookie/redirect Gate** — prove returned session cookies establish authenticated state
5. **Browser F3 Gate** — run full Playwright only after 1-4 are green
6. **Closeout Gate** — commit, PR, merge, and final status update

### Dependency Matrix
- 1 blocks 2-6
- 2 blocks 3-6
- 3 blocks 4-6
- 4 blocks 5-6
- 5 blocks 6

## TODOs

- [x] 1. Normalize verification runtime

  **What to do**: Kill all stale frontend dev processes. Start exactly one frontend runtime on port `3010` with explicit `ANIMAL_SERVICE_URL=http://127.0.0.1:8081`, `ADOPTER_SERVICE_URL=http://127.0.0.1:8082`, `USER_SERVICE_URL=http://127.0.0.1:8085`. Record the PID/log path.
  **Must NOT do**: Do not use whichever random port/process is already running. Do not switch ports mid-debug.

  **Acceptance Criteria**:
  - `curl -i http://127.0.0.1:3010/api/auth/session` returns `200`
  - runtime log identifies a single active frontend process

- [x] 2. Prove compose prerequisites before touching browser QA

  **What to do**: Start compose, verify `animal-service`, `adopter-service`, `user-service` are up and healthy, and verify host port reachability on `8081`, `8082`, `8085`.
  **Must NOT do**: Do not proceed if any required health endpoint is down.

  **Acceptance Criteria**:
  - `docker compose -f infrastructure/docker-compose.yml ps` shows required services `healthy`/`up`
  - `curl -i http://localhost:8081/actuator/health`
  - `curl -i http://localhost:8082/actuator/health`
  - `curl -i http://localhost:8085/actuator/health`

- [x] 3. Run session-bootstrap smoke before signup

  **What to do**: With a clean cookie jar, call `/api/auth/session`, capture status/body/cookies, and validate CSRF issuance. If this fails, debug only frontend BFF env/runtime/auth session handler.
  **Must NOT do**: Do not run signup or Playwright until this returns `200`.

  **Acceptance Criteria**:
  - response body contains `csrfToken`
  - `ci_csrf` cookie is set
  - status is `200`

- [x] 4. Run direct BFF signup smoke with unique email

  **What to do**: Submit one direct `POST /api/auth/signup` with a unique email using the CSRF token/cookies from Task 3. If it fails, debug only the failing layer shown by evidence: frontend handler, user-service, or adopter-service.
  **Must NOT do**: Do not use Playwright here. Do not reuse old email addresses.

  **Acceptance Criteria**:
  - status is success (non-5xx, non-502)
  - response body includes user/session fields needed by frontend
  - session cookies are returned/set

- [x] 5. Validate authenticated route behavior without full F3

  **What to do**: Reuse the successful signup cookie jar to hit protected routes directly, confirming authenticated access and expected redirects/denials before opening the browser.
  **Must NOT do**: Do not assume browser will work if cookie/redirect semantics are still unproven.

  **Acceptance Criteria**:
  - authenticated request to `/dashboard/matches` returns matches shell, not login redirect
  - adopter session request to admin route is denied or redirected away from admin content

- [x] 6. Run final Playwright F3 exactly once after all lower gates are green

  **What to do**: Clean browser state, use unique email, execute the full 7-step F3 scenario once on `http://127.0.0.1:3010`, and capture request statuses for `/api/auth/session` and `/api/auth/signup`.
  **Must NOT do**: Do not rerun F3 if any earlier gate is red. Do not reuse old browser context.

  **Acceptance Criteria**:
  - unauthenticated `/dashboard` redirects to `/login`
  - signup succeeds and redirects to authenticated adopter route
  - `/dashboard/matches` shows coming-soon copy with no error state
  - `/dashboard/admin/adopters` is inaccessible to adopter session

## Commit Strategy
- Commit 1: runtime/compose normalization only
- Commit 2: backend signup-path fix only
- Commit 3: frontend auth-runtime/env fix only (only if still needed)
- Commit 4: final verification/closeout status only if plan authority requires tracked artifact updates

## Success Criteria
- No wasted full-stack retries before lower-layer proof
- F3 passes in one final browser run
- Signup debugging evidence clearly identifies layer ownership at every stage
- No further long token-heavy loops on already-known failure modes
