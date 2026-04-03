# Caring Iggy

Monorepo for the Caring Iggy platform with separated frontend, backend, and infrastructure layers.

## Repository Layout

```
.
|-- frontend/        # Next.js + Tailwind landing and UI
|-- backend/         # Spring Boot services (multi-module Maven)
|-- infrastructure/  # Docker Compose and database infra assets
`-- .github/         # CI/CD workflows
```

## Backend Services

| Service | Port | Description |
|---------|------|-------------|
| animal-service | 8081 | Animal management (CRUD, status tracking) |
| user-service | 8085 | Employee management |
| matching-service | 8083 | Adopter-animal matching logic |
| reporting-service | 8084 | Reporting and summary endpoints |

## Quick Start

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 20+
- Docker and Docker Compose

### Backend build

```bash
mvn -f backend/pom.xml clean package -DskipTests
```

### Frontend build

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

### Infrastructure

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

## Notes

- `infrastructure/.env.example` contains sample environment variables for local setup.
- GitHub Actions workflows assume backend commands run from `backend/`.
