# Caring Iggy

Pet adoption platform. Adopters browse and register interest in animals. Staff manage animal records. Admins manage staff, adopters, and the full catalog.

## Architecture

```
Browser → Next.js BFF (port 3000) → Spring Boot microservices
```

The Next.js app is the only public-facing entry point. Microservice URLs are server-side only — never exposed to the browser. All mutations are CSRF-guarded through BFF route handlers.

## Repository Layout

```
frontend/          Next.js 16 app (UI + BFF route handlers)
backend/           Spring Boot services (Maven multi-module)
infrastructure/    Docker Compose + database definitions
.github/workflows/ CI/CD pipelines
```

## Frontend Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Styling | Tailwind CSS v4 + CSS custom properties (design tokens) |
| Primitives | CVA (`class-variance-authority`) + Radix Slot |
| Animation | CSS keyframes + Framer Motion (selective) |
| Icons | `lucide-react` |
| Auth | Cookie-based opaque sessions, CSRF-guarded mutations |
| Testing | Playwright — E2E browser tests + API contract tests |
| Language | TypeScript (strict) |

## Backend Services

| Service | Port | Responsibility |
|---|---|---|
| `animal-service` | 8081 | Animal CRUD, status tracking, intake records |
| `adopter-service` | 8082 | Adopter profiles, preferences, interest lists |
| `user-service` | 8085 | Staff/admin account management, auth (login, sessions) |
| `matching-service` | — | Preference-based adopter-animal matching |
| `reporting-service` | — | Intake and adoption summary reports |

All services are Spring Boot 3 / Java 17. Each has its own PostgreSQL database.

## Roles

| Role | Capabilities |
|---|---|
| `ADOPTER` | Browse animals, manage own preferences and interest list (max 3) |
| `STAFF` | Adopter permissions + create/edit/delete animal records |
| `ADMIN` | Staff permissions + manage adopter accounts and staff accounts |

## Pages

**Public:** `/` `/animals` `/animals/[id]` `/login` `/signup` `/about` `/donate`

**Authenticated (all roles):** `/dashboard`

**Adopter:** `/dashboard/preferences` `/dashboard/interests` `/dashboard/matches`

**Staff + Admin:** `/dashboard/animals/new` `/dashboard/animals/[id]/edit`

**Admin only:** `/dashboard/admin` `/dashboard/admin/staff/[id]` `/dashboard/admin/adopters/[id]`

## Quick Start

**Prerequisites:** Java 17+, Maven 3.8+, Node.js 20+, Docker + Docker Compose

### 1. Start infrastructure

```bash
bash infrastructure/kong/bootstrap-keys.sh        # once: RSA keypair → infrastructure/.env + kong.yml
docker compose -f infrastructure/docker-compose.yml up -d --build
```

This starts the PostgreSQL instances, the five backend services (no host ports) and the Kong gateway on `http://localhost:8000`. The frontend BFF is the only client of Kong; it exchanges its session for a short-lived JWT at `/internal/token`. Never commit `infrastructure/kong/kong.yml` with the real public key injected.

### 2. Start backend services

```bash
mvn -f backend/pom.xml clean package -DskipTests
java -jar backend/animal-service/target/*.jar &
java -jar backend/adopter-service/target/*.jar &
java -jar backend/user-service/target/*.jar &
```

### 3. Start frontend

```bash
cp frontend/.env.local.example frontend/.env.local   # set service URLs
npm --prefix frontend install
npm --prefix frontend run dev
```

Open `http://localhost:3000`.

## Frontend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KONG_URL` | `http://localhost:8000` | Kong gateway base URL; all backend calls go through it |
| `TRUST_PROXY_HEADERS` | `false` | Forward `X-Forwarded-For` to Kong; only behind an edge proxy that overwrites it |
| `AUTH_SESSION_STATE_SECRET` | — | HMAC secret for signing session state cookie |
| `AUTH_CSRF_SECRET` | — | HMAC secret for signing CSRF tokens |
| `APP_ORIGIN` | — | Trusted origin for CSRF origin check (e.g. `https://caringiggy.com`) |

In development, `AUTH_SESSION_STATE_SECRET` and `AUTH_CSRF_SECRET` fall back to hardcoded local values if unset.

## Testing

Tests require a running app (`npm run dev` or `npm run start`).

```bash
# All tests
npm --prefix frontend run test:e2e

# API contract tests only (fastest, no browser)
npm --prefix frontend run test:api

# Auth + RBAC tests
npm --prefix frontend run test:auth

# Smoke suite (tagged @smoke)
npm --prefix frontend run test:smoke
```

Test layout:

```
frontend/tests/
├─ api/          API contract tests (auth, animals, admin, adopter, CSRF, session)
├─ auth/         Login, redirects, and role-boundary E2E tests
├─ forms/        Staff form tests (animal create/edit)
└─ infra/        Kong gateway tests (hit :8000 directly: JWT, rate limit, network isolation)
```

## CI

`.github/workflows/ci.yml` — runs backend build + lint and frontend lint + build on every push.

`.github/workflows/docker-publish.yml` — builds and publishes Docker images on tagged releases.

## Infrastructure Notes

- `infrastructure/.env.example` — sample environment variables for local Docker Compose.
- Each microservice connects to its own isolated PostgreSQL database.
- No backend service binds a host port; the BFF reaches them only through Kong (`infrastructure/kong/kong.yml`).
- The frontend Docker service definition exists in `docker-compose.yml` but is commented out; it is run separately during development.
