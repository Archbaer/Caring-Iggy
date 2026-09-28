# Simple AWS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Caring Iggy on one EC2 host and one private RDS PostgreSQL instance with immutable releases, managed secrets, TLS, restart recovery, and tested rollback.

**Architecture:** Keep `infrastructure/docker-compose.yml` as the local and CI stack. Add an isolated AWS runtime containing Caddy, Next.js, Kong, and five Spring services, plus scripts for ephemeral secret rendering, database setup, first-admin bootstrap, and deployment. CloudFormation owns the VPC, EC2, RDS, IAM, networking, and a private one-day S3 artifact bucket; SSM downloads the exact uploaded runtime archive and performs host operations. Manual deployment stays outside GitHub AWS credentials.

**Tech Stack:** Java 17, Spring Boot 4.1.0, Spring Cloud 2025.1.2, Next.js, Docker Compose, Caddy 2.11.4, Kong OSS 3.9.3, PostgreSQL on RDS, AWS CloudFormation, Secrets Manager, SSM, Bash, ShellCheck, cfn-lint, Trivy, and k6.

**Spec:** `docs/superpowers/specs/2026-09-28-simple-aws-deployment-design.md`

## Global Constraints

- Deploy in `eu-west-2` with one x86_64 EC2 `t3.medium` (2 vCPU, 4 GiB RAM), Amazon Linux 2023 from the public SSM AMI parameter, 40 GiB encrypted gp3 root disk, and an Elastic IP.
- Use one private Single-AZ RDS PostgreSQL 15 `db.t4g.small`, 20 GiB encrypted gp3 storage, seven-day automated backups, point-in-time recovery, deletion protection, and snapshot deletion/update-replacement policies.
- RDS owns `animals_db`, `users_db`, and `adopters_db`; each has a distinct application login and password, and each service receives only its assigned credential.
- Only Caddy publishes TCP 80 and 443. Port 80 serves redirects and ACME challenges; no SSH, frontend, Kong, Spring, or PostgreSQL port is public.
- Use Systems Manager Session Manager and Run Command; require IMDSv2; do not configure an SSH key pair or inbound TCP 22.
- Production uses public DockerHub application images tagged `sha-` plus the first 12 Git commit characters; never use `latest` as a production input. Pin Caddy 2.11.4 and Kong OSS 3.9.3 to verified amd64 digests.
- Application image names follow the existing publish workflow: `${ImageOwner}/caring-iggy-animal-service`, `${ImageOwner}/caring-iggy-adopter-service`, `${ImageOwner}/caring-iggy-user-service`, `${ImageOwner}/caring-iggy-matching-service`, `${ImageOwner}/caring-iggy-reporting-service`, and `${ImageOwner}/caring-iggy-frontend`.
- Production starts with schema-required reference rows plus the generated first administrator only. Demo animals, adopters, employees, accounts, and known passwords stay in `classpath:db/dev`; local Compose and CI explicitly include it, production uses only `classpath:db/migration`.
- No production secret enters Git or a persistent production `.env` file. `/run/caring-iggy` is mode 0700; secret-bearing files are mode 0600; persistent `/etc/caring-iggy/deployment.env` contains only non-secret values.
- A private encrypted stack-owned S3 bucket transports only a versioned archive of committed AWS runtime files. Public access is blocked, objects expire after one day, and EC2 can read only this bucket prefix.
- The application secret bundle contains JWT PKCS#8 private/public keys and key ID, frontend session and CSRF HMAC secrets, three independent database usernames/passwords, and initial administrator email/password. The JWT private key reaches only user service; scripts never print the administrator password.
- Spring services use PostgreSQL TLS (`sslmode=require`), Hikari maximum pool size 5 and minimum idle 1 for DB-backed services, INFO application/JDBC logging, and internal-only actuator endpoints.
- Use a separate `infrastructure/aws/docker-compose.prod.yml`; do not add PostgreSQL or source builds to it. Long-running containers use `restart: unless-stopped`, rotated `json-file` logs (`max-size: 10m`, `max-file: 3`), health checks, tested memory limits, and JVM bounds.
- Caddy is the only edge proxy, serves the temporary allocated Elastic IP HTTPS origin with the Let's Encrypt short-lived IP certificate profile, persists `/data` and `/config`, and has no fallback issuer. Browser origin is `https://` plus the allocated Elastic IP; BFF gateway is `KONG_URL=http://kong:8000` and `TRUST_PROXY_HEADERS=true`.
- EC2 reboot restores the stack through systemd. Startup dependencies use six bounded exponential-backoff attempts; systemd retries failures after five minutes and resets failure state after successful preparation.
- Deployment inspects the CloudFormation change set and refuses RDS replacement. It preserves the currently successful immutable image tag before changing host state, promotes a candidate only after healthy containers and external HTTPS, and restores the prior tag on failed verification.
- Do not automatically roll back database schema. New migrations must remain compatible with the previous image and use expand/migrate/contract for destructive changes.
- GitHub Actions keeps building and publishing public DockerHub images, and receives no AWS credentials. Production deployment remains manual.
- Load acceptance on the 4 GiB host: 300 concurrent virtual users for 10 minutes and a 700-user burst for 2 minutes; no OOM kill or failed health check; HTTP 5xx and k6 check failures each below 1%; p95 below 2 seconds and p99 below 5 seconds.
- Test deployment uses one disposable AWS stack and verifies network exposure, trusted HTTPS/redirects, isolated DB roles, healthy containers, reboot recovery, bad-image rollback, and RDS point-in-time restore before production acceptance.
- Keep disposable verification stack running for 8 days and verify at least one renewed Let's Encrypt IP certificate by changed serial number and future expiry before acceptance.

## Review Focus

- A missing, mutable, or malformed image tag must fail before any AWS mutation; Task 8 owns `infrastructure/aws/tests/deploy-aws.test.sh::test_rejects_non_sha_image_tag_before_aws_calls`.
- Generated single-line base64 and hexadecimal secret values, including base64 `+`, `/`, and `=` characters, must survive JSON parsing without entering logs, shell arguments, or persistent files; Task 5 owns `infrastructure/aws/tests/prepare-runtime.test.sh::test_writes_generated_secret_formats_exactly_and_redacts_output`.
- Database roles must stay isolated after repeated initialization, and first-admin bootstrap must be idempotent for the configured email while refusing a different second administrator; Task 5 owns the isolation test plus `infrastructure/aws/tests/bootstrap-admin.test.sh`.
- A CloudFormation update that replaces RDS or opens any public port outside 80/443 must be rejected before rollout; Task 8 owns `infrastructure/aws/tests/deploy-aws.test.sh::test_refuses_rds_replacement_and_unapproved_ingress`.
- A failed candidate health check must restore the last successful tag, while reboot preparation failure must retry after the configured five-minute delay; Task 9 owns `infrastructure/aws/tests/deploy-aws.test.sh::test_failed_candidate_restores_current_tag` and Task 6 owns `infrastructure/aws/tests/boot-recovery.test.sh::test_systemd_retries_preparation_failure_after_five_minutes`.

---

## Phase 1 — Supported Spring baseline and production-safe data/configuration

### Task 1: Upgrade and stabilize Spring dependency baseline

**Files:**
- Modify: `backend/pom.xml`
- Modify only when Maven's compatibility diagnostics require it: `backend/animal-service/pom.xml`, `backend/adopter-service/pom.xml`, `backend/user-service/pom.xml`, `backend/matching-service/pom.xml`, `backend/reporting-service/pom.xml`
- Modify only when the new Java baseline requires it: `backend/*/Dockerfile`
- Test: existing five service test suites and Maven reactor verification

**Interfaces:**
- Consumes: existing Maven reactor with Java 17, Spring Cloud dependency management, Flyway, Security, OpenFeign, and Resilience4j.
- Produces: all five service modules build on Spring Boot `4.1.0` and Spring Cloud `2025.1.2`; Java stays 17 unless those exact dependency baselines require a higher version.

- [ ] **Step 1: Write the failing version assertion**

Run from `backend/`:

```bash
test "$(mvn -q -DforceStdout help:evaluate -Dexpression=project.parent.version)" = "4.1.0"
```

Expected before edits: FAIL because the parent currently resolves to `3.2.0`. Confirm the current Cloud property with `mvn -q -DforceStdout help:evaluate -Dexpression=spring-cloud.version`; it prints `2023.0.0`.

- [ ] **Step 2: Set the approved parent versions**

In `backend/pom.xml`, set the parent version to `4.1.0` and `<spring-cloud.version>` to `2025.1.2`. Keep `<java.version>17</java.version>` pending build evidence. Do not add unrelated dependency upgrades.

- [ ] **Step 3: Resolve only concrete incompatibilities**

Run the reactor test command below. For each compile/test failure caused by removed APIs or changed managed artifacts, update the owning service POM or Java source and add a focused regression test beside the affected code. Do not blanket-upgrade libraries that still resolve and pass.

- [ ] **Step 4: Verify all service modules and quality gates**

Run from `backend/`:

```bash
mvn -B clean verify
```

Expected: all five modules compile, existing unit/security/controller tests pass, Checkstyle passes, and SpotBugs passes. If the requested Cloud baseline cannot resolve or its compatibility range rejects Boot `4.1.0`, stop and report exact Maven diagnostics; do not silently substitute versions.

- [ ] **Step 5: Commit Spring baseline**

```bash
git add backend/pom.xml backend/animal-service/pom.xml backend/adopter-service/pom.xml backend/user-service/pom.xml backend/matching-service/pom.xml backend/reporting-service/pom.xml backend/animal-service/Dockerfile backend/adopter-service/Dockerfile backend/user-service/Dockerfile backend/matching-service/Dockerfile backend/reporting-service/Dockerfile
git commit -m "build: upgrade supported Spring baseline"
```

### Task 2: Separate demo fixtures from production migrations

**Files:**
- Modify: `backend/animal-service/src/main/resources/db/migration/V1__create_animals_tables.sql`
- Delete: `backend/animal-service/src/main/resources/db/migration/V2__seed_data.sql`
- Create: `backend/animal-service/src/main/resources/db/dev/R__animal_demo_data.sql`
- Modify: `backend/adopter-service/src/main/resources/db/migration/V1__create_adopters_tables.sql`
- Delete: `backend/adopter-service/src/main/resources/db/migration/V2__seed_data.sql`
- Delete: `backend/adopter-service/src/main/resources/db/migration/V3__test_adopter.sql`
- Create: `backend/adopter-service/src/main/resources/db/dev/R__adopter_demo_data.sql`
- Modify: `backend/user-service/src/main/resources/db/migration/V1__create_employees_table.sql`
- Modify: `backend/user-service/src/main/resources/db/migration/V2__add_auth_accounts_and_sessions.sql`
- Modify: `backend/user-service/src/main/resources/db/migration/V3__add_account_profile_type.sql`
- Delete: `backend/user-service/src/main/resources/db/migration/V4__seed_data.sql`
- Delete: `backend/user-service/src/main/resources/db/migration/V5__test_accounts.sql`
- Delete: `backend/user-service/src/main/resources/db/migration/V6__legacy_test_account.sql`
- Create: `backend/user-service/src/main/resources/db/dev/R__user_demo_accounts.sql`
- Modify: `infrastructure/docker-compose.yml`
- Create: `infrastructure/aws/tests/migration-data.test.sh`

**Interfaces:**
- Consumes: the current versioned schema migrations and the local/CI Compose workflow, which supplies demo accounts required by Playwright.
- Produces: production Flyway location `classpath:db/migration`; local and CI Flyway locations `classpath:db/migration,classpath:db/dev`; dev scripts are idempotent repeatable migrations and production schema/reference data includes no people, accounts, or animals.

- [ ] **Step 1: Add a failing migration-data assertion**

Create `infrastructure/aws/tests/migration-data.test.sh` with this initial check:

```bash
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
if rg -n "INSERT INTO (animals|adopters|employees|accounts)" "$root"/backend/*/src/main/resources/db/migration; then
  echo "demo identities or animals found in production migrations" >&2
  exit 1
fi
```

Run `bash infrastructure/aws/tests/migration-data.test.sh`. Expected: FAIL on `animal-service` V2, `adopter-service` V2/V3, and `user-service` V4-V6.

- [ ] **Step 2: Preserve schema-required reference rows in schema migrations**

Keep animal type/status/size/gender rows and adopter status rows in V1 because foreign keys and default IDs require them. Keep employee role rows in user V1. Add `ON CONFLICT (name) DO NOTHING` so those schema rows are safe on recreated test databases. Leave the V1/V2/V3 table and constraint operations in production migration paths; move every example person/account/animal/history insert out.

- [ ] **Step 3: Move demo/test inserts into repeatable dev scripts**

Create the three `db/dev/R__...sql` files using the existing fixture identities and data. Make each insert idempotent with `ON CONFLICT (id) DO NOTHING`; preserve `user-service` legacy `EMPLOYEE` role test fixture and its compatibility constraint only in `R__user_demo_accounts.sql`. Do not include known-password rows in any `db/migration` file.

- [ ] **Step 4: Explicitly select dev fixtures for local Compose and CI**

Add `SPRING_FLYWAY_LOCATIONS: classpath:db/migration,classpath:db/dev` to the `animal-service`, `adopter-service`, and `user-service` local Compose environments. CI uses that same Compose file, while production does not inherit it.

- [ ] **Step 5: Test clean local/CI data and production data policies**

Run:

```bash
bash infrastructure/aws/tests/migration-data.test.sh
bash infrastructure/kong/bootstrap-keys.sh
docker compose -f infrastructure/docker-compose.yml up -d --build --wait kong
docker compose -f infrastructure/docker-compose.yml exec -T postgres-animals psql -U postgres -d animals_db -c "SELECT count(*) FROM animals"
docker compose -f infrastructure/docker-compose.yml exec -T postgres-users psql -U postgres -d users_db -c "SELECT count(*) FROM accounts"
```

Expected on fresh local/CI volumes: migration policy test PASS; local fixture counts are greater than zero. Never run `docker compose down -v` against existing user volumes automatically. If existing Flyway history conflicts after moving seed migrations, stop and request explicit approval before resetting volumes; otherwise verify clean migration behavior in CI or a disposable workspace.

- [ ] **Step 6: Commit seed separation**

```bash
git add backend/animal-service/src/main/resources/db backend/adopter-service/src/main/resources/db backend/user-service/src/main/resources/db infrastructure/docker-compose.yml infrastructure/aws/tests/migration-data.test.sh
git commit -m "fix: keep demo identities out of production migrations"
```

### Task 3: Make Spring runtime settings production-configurable

**Files:**
- Modify: `backend/animal-service/src/main/resources/application.yml`
- Modify: `backend/adopter-service/src/main/resources/application.yml`
- Modify: `backend/user-service/src/main/resources/application.yml`
- Modify: `backend/matching-service/src/main/resources/application.yml`
- Modify: `backend/reporting-service/src/main/resources/application.yml`
- Create: `backend/animal-service/src/test/java/com/caringiggy/animal/config/RuntimeConfigurationTest.java`
- Create: `backend/adopter-service/src/test/java/com/caringiggy/adopter/config/RuntimeConfigurationTest.java`
- Create: `backend/user-service/src/test/java/com/caringiggy/user/config/RuntimeConfigurationTest.java`
- Create: `backend/matching-service/src/test/java/com/caringiggy/matching/config/RuntimeConfigurationTest.java`
- Create: `backend/reporting-service/src/test/java/com/caringiggy/reporting/config/RuntimeConfigurationTest.java`

**Interfaces:**
- Consumes: runtime environment variables loaded by Compose; DB-backed services are animal, adopter, and user.
- Produces: JDBC URL with `sslmode=require`, configurable `spring.datasource.hikari.maximum-pool-size` and `minimum-idle`, production overrides of 5 and 1, configurable log levels, and internal actuator health/info exposure.

- [ ] **Step 1: Add focused configuration tests for each module**

In each `RuntimeConfigurationTest`, assert management exposure and logging overrides; in the animal, adopter, and user tests also load datasource configuration and assert TLS URL and pool overrides. Set `DB_SSLMODE=require`, `DB_POOL_MAX=5`, and `DB_POOL_MIN_IDLE=1` in the test context. Example for animal service:

```java
@Test
void datasourceAcceptsProductionTlsAndPoolOverrides() {
    assertThat(environment.getProperty("spring.datasource.url"))
            .contains("sslmode=require");
    assertThat(environment.getProperty("spring.datasource.hikari.maximum-pool-size"))
            .isEqualTo("5");
    assertThat(environment.getProperty("spring.datasource.hikari.minimum-idle"))
            .isEqualTo("1");
}
```

Run `mvn -B -pl animal-service -am -Dtest=RuntimeConfigurationTest -Dsurefire.failIfNoSpecifiedTests=false test` from `backend/`. Expected: FAIL because current JDBC URL omits TLS and pool values are fixed to 10/5.

- [ ] **Step 2: Parameterize DB URL, Hikari, and logging values**

Change each DB-backed datasource URL to append `?sslmode=${DB_SSLMODE:disable}` so local PostgreSQL remains unchanged and production sets `DB_SSLMODE=require`. Set Hikari settings from `${DB_POOL_MAX:10}` and `${DB_POOL_MIN_IDLE:5}`. Production Compose will set `DB_POOL_MAX=5`, `DB_POOL_MIN_IDLE=1`, `LOGGING_LEVEL_COM_CARINGIGGY=INFO`, and `LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_JDBC=INFO` where present. Use environment override for actuator exposure and keep actuator bound to internal container networks.

- [ ] **Step 3: Verify runtime properties and unchanged local defaults**

Run from `backend/`:

```bash
mvn -B -Dtest=RuntimeConfigurationTest -Dsurefire.failIfNoSpecifiedTests=false test
mvn -B test
```

Expected: configuration tests PASS for production overrides; local datasource host/name/default credentials remain as before and backend test suite passes.

- [ ] **Step 4: Commit production runtime controls**

```bash
git add backend/animal-service/src/main/resources/application.yml backend/adopter-service/src/main/resources/application.yml backend/user-service/src/main/resources/application.yml backend/matching-service/src/main/resources/application.yml backend/reporting-service/src/main/resources/application.yml backend/animal-service/src/test/java/com/caringiggy/animal/config/RuntimeConfigurationTest.java backend/adopter-service/src/test/java/com/caringiggy/adopter/config/RuntimeConfigurationTest.java backend/user-service/src/test/java/com/caringiggy/user/config/RuntimeConfigurationTest.java backend/matching-service/src/test/java/com/caringiggy/matching/config/RuntimeConfigurationTest.java backend/reporting-service/src/test/java/com/caringiggy/reporting/config/RuntimeConfigurationTest.java
git commit -m "feat: configure production Spring runtime limits"
```

## Phase 2 — Host runtime, Compose, Caddy, Kong, and database initialization

### Task 4: Add production Caddy, Kong, and Compose configuration

**Files:**
- Create: `infrastructure/aws/Caddyfile.template`
- Create: `infrastructure/aws/kong.prod.yml.template`
- Create: `infrastructure/aws/docker-compose.prod.yml`
- Create: `infrastructure/aws/tests/production-compose.test.sh`
- Modify: `infrastructure/docker-compose.yml`

**Interfaces:**
- Consumes: six public DockerHub application image names from `DOCKER_IMAGE_PREFIX` and immutable `IMAGE_TAG`; generated `/run/caring-iggy/kong.yml`; runtime env files from Task 5.
- Produces: Compose project with services `caddy`, `frontend`, `kong`, `animal-service`, `adopter-service`, `user-service`, `matching-service`, and `reporting-service`; only Caddy maps host ports; runtime paths use `${RUNTIME_DIR:-/run/caring-iggy}` so tests can substitute temporary fixtures; `Caddyfile.template` takes `APP_ORIGIN`; Kong template takes only the JWT public key.

- [ ] **Step 1: Add production Compose assertions and run them red**

Create `infrastructure/aws/tests/production-compose.test.sh` that invokes `docker compose -f infrastructure/aws/docker-compose.prod.yml config` and asserts rendered service count, no `build:` entries, no PostgreSQL services, only host mappings `80:80` and `443:443`, and no `container_name`. Use non-secret fixture environment variables. Expected before the production file exists: FAIL because the Compose file cannot be opened.

- [ ] **Step 2: Create production Kong template**

Copy route/service behavior from `infrastructure/kong/kong.yml` into `kong.prod.yml.template`; remove global CORS and keep OSS `policy: local` rate limits. Replace only the consumer RSA public-key block with `__JWT_PUBLIC_KEY_PEM__`. Keep consumer key `caring-iggy-user-service` aligned with JWT `iss`; keep distinct `JWT_KEY_ID=ci-key-1` aligned with JWT `kid`. Configure `KONG_DATABASE=off`, proxy listener `0.0.0.0:8000`, admin listener `127.0.0.1:8001`, and `KONG_TRUSTED_IPS=172.30.0.0/24` in production Compose, not in the declarative template.

- [ ] **Step 3: Create the Caddy site template and production Compose file**

Use Caddy 2.11.4 with the verified amd64 manifest digest of `caddy:2.11.4`; use Kong OSS 3.9.3 with the verified amd64 manifest digest of `kong:3.9.3`. Record each selected immutable `sha256:` digest in the production Compose image field after checking `docker buildx imagetools inspect`. Caddy binds `:80` for redirect/challenge and `:443` for HTTPS using `tls { issuer acme { ca https://acme-v02.api.letsencrypt.org/directory profile shortlived } }`; proxy only to `frontend:3000`; persist `/data` and `/config` named volumes. Compose reads generated single-line environment values under `${RUNTIME_DIR:-/run/caring-iggy}` and non-secret `/etc/caring-iggy/deployment.env`. JWT PEM values are base64 encoded before entering env files and decoded only by the consuming startup path; HMAC and database passwords are hexadecimal. Add `unless-stopped`, bounded `json-file` logs, service health checks/start periods, read-only Kong config, `edge` (`172.30.0.0/24`) and `backend` internal networks, and JVM/memory limits sized to the 4 GiB host.

- [ ] **Step 4: Verify Compose invariants and local workflow**

Update local `infrastructure/docker-compose.yml` Kong image from `kong:3.6` to `kong:3.9.3`, preserving host port 8000, DB-less mode, and its dev CORS behavior. Run:

```bash
bash infrastructure/aws/tests/production-compose.test.sh
docker compose -f infrastructure/docker-compose.yml config >/dev/null
```

Expected: production-compose assertions PASS, no host ports besides 80/443 appear in rendered config, local Compose parses with its existing host ports/build path/dev fixtures, and local Kong stays compatible with `infrastructure/kong/kong.yml`.

- [ ] **Step 5: Commit production edge/runtime definitions**

```bash
git add infrastructure/aws/Caddyfile.template infrastructure/aws/kong.prod.yml.template infrastructure/aws/docker-compose.prod.yml infrastructure/aws/tests/production-compose.test.sh infrastructure/docker-compose.yml
git commit -m "feat: define isolated AWS container runtime"
```

### Task 5: Implement root-only secret preparation and database initialization

**Files:**
- Create: `infrastructure/aws/prepare-runtime.sh`
- Create: `infrastructure/aws/init-databases.sh`
- Create: `infrastructure/aws/bootstrap-admin.sh`
- Create: `infrastructure/aws/tests/prepare-runtime.test.sh`
- Create: `infrastructure/aws/tests/init-databases.test.sh`
- Create: `infrastructure/aws/tests/bootstrap-admin.test.sh`
- Modify: `infrastructure/aws/docker-compose.prod.yml`

**Interfaces:**
- Consumes: `AWS_REGION`, `APP_SECRET_ARN`, `RDS_SECRET_ARN`, `RDS_ENDPOINT`, and instance-role `secretsmanager:GetSecretValue`; application JSON keys are `jwt.privateKeyBase64`, `jwt.publicKeyBase64`, `jwt.keyId`, `frontend.sessionSecretHex`, `frontend.csrfSecretHex`, `databases.animals.username/passwordHex`, `databases.users.username/passwordHex`, `databases.adopters.username/passwordHex`, and `initialAdmin.email/passwordHex`; RDS-managed master JSON keys are `username` and `password`.
- Produces: `prepare-runtime.sh` creates `/run/caring-iggy/{animal-service,adopter-service,user-service,frontend}.env` and `/run/caring-iggy/kong.yml`; `init-databases.sh` establishes only the three owner/login roles and databases and enables `pgcrypto` in `users_db`; `bootstrap-admin.sh` creates or verifies exactly one initial administrator after Flyway. All scripts return nonzero with redacted diagnostics on failure.

- [ ] **Step 1: Write red secret-file and redaction tests**

Create `prepare-runtime.test.sh` with stub `aws`, `docker`, and `install` commands that supply valid generated-format fixtures: base64 key values containing `+`, `/`, and `=`, plus hexadecimal HMAC/database values. Assert files preserve exact single-line values, directory mode is 0700, files are 0600, `kong.yml` contains decoded public but not private key, and captured stdout/stderr does not contain fixture values. Run `bash infrastructure/aws/tests/prepare-runtime.test.sh`; expected: FAIL because script does not exist.

- [ ] **Step 2: Implement secret retrieval and ephemeral file generation**

Implement strict shell mode and `umask 077`; create `/run/caring-iggy` mode 0700, retrieve JSON into mode-0600 temporary files from AWS CLI calls using secret ARNs, validate base64/hex/email formats with `jq`, and write per-service env files without placing values in command arguments. Set files to 0600, decode only the public key to render Kong from `kong.prod.yml.template`, and verify modes before returning success. Use cleanup traps for temporary files and never enable `set -x`.

- [ ] **Step 3: Write red database isolation/idempotency tests**

Create `init-databases.test.sh` using a disposable PostgreSQL 15 container and fake AWS responses. Run initializer twice; then use `psql` as each application role to connect to its own database and assert connection to both other databases fails. Assert `pgcrypto` exists only where required. Capture logs and assert generated passwords never appear. Expected before implementation: FAIL because initializer does not exist.

- [ ] **Step 4: Implement least-privilege database initialization**

Run an ephemeral PostgreSQL client container on the Compose backend network; connect with RDS master secret, create `animals_db`, `users_db`, and `adopters_db` if absent, create/update the three application logins, set each assigned database owner, revoke `CONNECT` from `PUBLIC`, grant `CONNECT` only to its assigned login, revoke public schema privileges in each DB, and enable `pgcrypto` in `users_db`. Supply SQL values through `psql` variables with safely quoted literals; do not interpolate raw secret text into SQL or logs. Verify role access by opening one connection to each assigned DB and expecting permission denial on the two unassigned DBs.

- [ ] **Step 5: Add idempotent first-administrator bootstrap**

Create `bootstrap-admin.test.sh` against disposable PostgreSQL 15 after applying user-service Flyway migrations. Test three transactions: an empty database creates one `employees` row named `Initial Administrator` with role `ADMIN` and one linked `accounts` row with profile type `EMPLOYEE`; rerunning with the same email changes nothing; an existing `ADMIN` with another email returns nonzero. Verify `password_hash` matches `crypt(password, password_hash)`, uses bcrypt cost 12, and no email/password/hash appears in output. Implement `bootstrap-admin.sh` with parameterized `psql` variables, one transaction, `uuid_generate_v4()`, `crypt(..., gen_salt('bf', 12))`, and application-secret retrieval through a protected temporary file.

- [ ] **Step 6: Connect generated env paths to production Compose**

Set each Spring service `env_file` to its named `/run/caring-iggy/*.env`, and frontend `env_file` to `/run/caring-iggy/frontend.env`. Set `SPRING_FLYWAY_LOCATIONS=classpath:db/migration`, `DB_SSLMODE=require`, production pool limits, secure session cookie, and exact origin/Kong values from non-secret deployment inputs.

- [ ] **Step 7: Verify shell hygiene and fixture tests**

Run:

```bash
bash -n infrastructure/aws/prepare-runtime.sh infrastructure/aws/init-databases.sh infrastructure/aws/bootstrap-admin.sh
shellcheck infrastructure/aws/prepare-runtime.sh infrastructure/aws/init-databases.sh infrastructure/aws/bootstrap-admin.sh
bash infrastructure/aws/tests/prepare-runtime.test.sh
bash infrastructure/aws/tests/init-databases.test.sh
bash infrastructure/aws/tests/bootstrap-admin.test.sh
```

Expected: ShellCheck clean; generated secret-format, permission, redaction, database isolation, repeat-run, and first-admin assertions PASS.

- [ ] **Step 8: Commit runtime secret/database preparation**

```bash
git add infrastructure/aws/prepare-runtime.sh infrastructure/aws/init-databases.sh infrastructure/aws/bootstrap-admin.sh infrastructure/aws/tests infrastructure/aws/docker-compose.prod.yml
git commit -m "feat: prepare runtime secrets and database bootstrap"
```

### Task 6: Add reboot recovery systemd unit and bounded retry behavior

**Files:**
- Create: `infrastructure/aws/caring-iggy.service`
- Create: `infrastructure/aws/start-stack.sh`
- Create: `infrastructure/aws/tests/boot-recovery.test.sh`
- Modify: `infrastructure/aws/docker-compose.prod.yml`

**Interfaces:**
- Consumes: non-secret `/etc/caring-iggy/deployment.env`, Task 5 scripts, Docker Compose production file, network-online and Docker systemd units.
- Produces: systemd unit `caring-iggy.service`; `start-stack.sh` performs six bounded exponential-backoff attempts for AWS secret retrieval, DockerHub pulls, and RDS readiness; systemd waits five minutes between process failures and resets failure state after successful preparation.

- [ ] **Step 1: Add failure-path systemd behavior tests**

Create `boot-recovery.test.sh` with stub commands and assertions for the rendered unit's `After=network-online.target docker.service`, `Restart=on-failure`, and `RestartSec=5min`; simulate preparation failing six attempts and assert nonzero plus exact waits `1 2 4 8 16` seconds between attempts. Expected: FAIL because runtime unit/scripts are absent.

- [ ] **Step 2: Implement start-stack retry wrapper**

Implement `start-stack.sh` with `set -euo pipefail`, `attempt=1`, `max_attempts=6`, exponential sleeps capped at 32 seconds, then call `prepare-runtime.sh`, `init-databases.sh`, `docker compose pull`, and `docker compose up -d --wait`. Return immediately after successful preparation and Compose health; return nonzero after sixth failure without printing environment or secret contents.

- [ ] **Step 3: Define versioned service unit for archive installation**

Create `caring-iggy.service` with `Wants=network-online.target`, `After=network-online.target docker.service`, `Type=oneshot`, `RemainAfterExit=yes`, `ExecStart=/opt/caring-iggy/start-stack.sh`, `Restart=on-failure`, `RestartSec=5min`, and `StartLimitIntervalSec=0`. Task 9 installs and enables this file from the downloaded versioned archive. On success use `systemctl reset-failed caring-iggy.service` from the successful wrapper path.

- [ ] **Step 4: Verify retries and Compose reboot policy**

Run:

```bash
bash -n infrastructure/aws/start-stack.sh
shellcheck infrastructure/aws/start-stack.sh
bash infrastructure/aws/tests/boot-recovery.test.sh
bash infrastructure/aws/tests/production-compose.test.sh
```

Expected: retry timing and unit policy assertions PASS; all production long-running services have `restart: unless-stopped`.

- [ ] **Step 5: Commit reboot recovery**

```bash
git add infrastructure/aws/caring-iggy.service infrastructure/aws/start-stack.sh infrastructure/aws/tests/boot-recovery.test.sh infrastructure/aws/docker-compose.prod.yml
git commit -m "feat: restore AWS containers after host reboot"
```

## Phase 3 — CloudFormation, secrets, deploy, and rollback

### Task 7: Define one-stack AWS infrastructure in CloudFormation

**Files:**
- Create: `infrastructure/aws/template.yml`
- Create: `infrastructure/aws/tests/template.test.sh`

**Interfaces:**
- Consumes: parameters `ImageOwner` and `ImageTag`; region is fixed by the operator to `eu-west-2`.
- Produces: outputs `InstanceId`, `ElasticIp`, `RdsEndpoint`, `AppSecretArn`, `RdsSecretArn`, `ArtifactBucketName`, `InstanceProfileArn`, and `StackName`; EC2 role can read only the two stack secrets, read objects from the stack artifact bucket, and use SSM.

- [ ] **Step 1: Add red template invariants**

Create `template.test.sh` using `cfn-lint` and `yq`/CloudFormation JSON conversion to assert RDS PostgreSQL major version 15, one public EC2 subnet, two private DB subnets across AZs, no NAT Gateway, no inbound 22, only EC2 SG ingress 80/443, RDS ingress only from EC2 SG, IMDSv2 required, encrypted 40 GiB EC2 and 20 GiB RDS volumes, backup retention 7, deletion protection true, Snapshot policies, and a private encrypted artifact bucket with a one-day lifecycle. Assert EC2 `s3:GetObject` is scoped to that bucket's object ARN, no `s3:*` permission exists, and deployment contract tests require `CAPABILITY_IAM` because the template creates an unnamed IAM role and instance profile. Expected: FAIL because `template.yml` does not exist.

- [ ] **Step 2: Define network, security groups, database, and secrets**

Create one VPC, public subnet with internet gateway route, two isolated private subnets and DB subnet group. Add a public Elastic IP. Define RDS PostgreSQL major version `15`, instance class `db.t4g.small`, 20 GiB encrypted gp3, private, Single-AZ, seven-day backup retention, deletion protection, and both snapshot policies. Configure `ManageMasterUserPassword: true`. Create the application Secrets Manager secret container without a value. Add one stack-owned S3 bucket with SSE-S3, all four public-access blocks, bucket-owner-enforced ownership, and a one-day expiration lifecycle. Give EC2 SSM managed-instance permissions, `secretsmanager:GetSecretValue` only on the two secret ARNs, and `s3:GetObject` only on `${ArtifactBucket.Arn}/deployments/*`; grant no list, write, delete, or wildcard S3 permission.

- [ ] **Step 3: Define hardened EC2 and short bootstrap**

Use `AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>` for `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`; use `t3.medium`, encrypted 40 GiB gp3, `HttpTokens: required`, no key pair, no SSH ingress, and the EC2 security group. User data only installs Docker/Compose and AWS CLI prerequisites, enables Docker, and creates `/etc/caring-iggy`, `/opt/caring-iggy`, and `/run/caring-iggy`. It does not contain or install repository scripts, Compose files, templates, or systemd units; Task 9 installs those from the versioned artifact archive.

- [ ] **Step 4: Validate the template and static invariants**

Run:

```bash
cfn-lint infrastructure/aws/template.yml
bash infrastructure/aws/tests/template.test.sh
aws cloudformation validate-template --template-body file://infrastructure/aws/template.yml --region eu-west-2
```

Expected: cfn-lint, custom invariants, and AWS template syntax pass; no resources expose DB or SSH publicly.

- [ ] **Step 5: Commit infrastructure template**

```bash
git add infrastructure/aws/template.yml infrastructure/aws/tests/template.test.sh
git commit -m "feat: define single-host AWS infrastructure"
```

### Task 8: Implement safe operator entrypoint and first-time secret creation

**Files:**
- Create: `infrastructure/aws/deploy-aws.sh`
- Create: `infrastructure/aws/tests/deploy-aws.test.sh`
- Modify: `infrastructure/aws/template.yml`

**Interfaces:**
- Consumes: CLI inputs `--stack-name NAME --stack-purpose production|disposable --image-owner OWNER --image-tag` followed by `sha-` and exactly 12 lowercase hexadecimal characters, `--admin-email EMAIL`, and `--region eu-west-2`; commands AWS CLI, Docker, Compose, `jq`, OpenSSL, Trivy, and CloudFormation. Application secret value is created only if its current value is absent.
- Produces: deterministic preflight validation, infrastructure create/update, RDS replacement refusal, secure first application secret creation including initial-admin credentials, and the complete CloudFormation outputs needed by Task 9.

- [ ] **Step 1: Add preflight and CloudFormation safety tests**

Create fake `aws`, `docker`, and `openssl` executables in `deploy-aws.test.sh`. Assert missing CLI, wrong region, missing image owner, missing or malformed administrator email, `latest`, a non-`sha-` tag, or a tag not exactly 12 hexadecimal commit characters exits nonzero before any fake AWS mutation. Assert a change set containing `Replacement: True` for `AWS::RDS::DBInstance` is rejected before SSM. Expected: FAIL because entrypoint does not exist.

- [ ] **Step 2: Implement deterministic validation and local preflight**

Parse only the named flags; require AWS CLI v2, authenticated caller identity, region exactly `eu-west-2`, Docker Compose v2.30 or later, `jq`, OpenSSL, Trivy, an administrator email accepted by the application's current email validation, and image tag matching `^sha-[0-9a-f]{12}$`. Before CloudFormation calls, run `bash -n`, ShellCheck, production Compose config with dummy secrets, cfn-lint, secret scan, and Trivy scans of all six candidate images plus pinned Caddy/Kong digests. Never call `docker compose` with production `.env`.

- [ ] **Step 3: Add application secret container outputs and create-only-once initialization**

Ensure template output exposes `AppSecretArn`, `RdsSecretArn`, and `ArtifactBucketName`. After stack create/update succeeds, call `secretsmanager get-secret-value`; only an existing secret with no current `SecretString` permits first initialization. Generate an RSA 3072 key pair stored as single-line base64, distinct key ID `ci-key-1`, 32-byte hexadecimal session and CSRF secrets, independent 32-byte hexadecimal database passwords, and one 32-byte hexadecimal initial-administrator password in a mode-0700 temporary directory under `umask 077`. Store the supplied administrator email. Assemble JSON using `jq -n`, pass AWS CLI `--secret-string file://...`, remove the temporary directory in `trap`, and never rotate or replace an existing value during normal deploy. If the secret already exists, ignore the new `--admin-email` for mutation and verify it matches the stored value before continuing.

- [ ] **Step 4: Inspect change set and block database replacement**

Create or update stack through a named change set with `--capabilities CAPABILITY_IAM` and tag it `Purpose=$STACK_PURPOSE`. Do not name IAM resources, so `CAPABILITY_NAMED_IAM` is unnecessary. Parse `describe-change-set` JSON with `jq`; exit before execution if any `AWS::RDS::DBInstance` change has `Replacement` equal to `True` or `Conditional`, or if any changed public security-group ingress opens a port other than TCP 80 or 443. Execute only an accepted change set, wait for stack completion, and preserve snapshot/deletion protection behavior. Contract tests assert every create/update change-set call supplies `CAPABILITY_IAM`.

- [ ] **Step 5: Test early exits, secret lifecycle, and template validation**

Run:

```bash
bash -n infrastructure/aws/deploy-aws.sh
shellcheck infrastructure/aws/deploy-aws.sh
bash infrastructure/aws/tests/deploy-aws.test.sh
```

Expected: malformed inputs produce zero AWS mutation calls; existing application secret causes zero `put-secret-value` calls; first deployment creates one value; replacement change set exits nonzero before execution.

- [ ] **Step 6: Commit safe deploy preflight**

```bash
git add infrastructure/aws/deploy-aws.sh infrastructure/aws/tests/deploy-aws.test.sh infrastructure/aws/template.yml
git commit -m "feat: validate AWS deploy inputs and secrets"
```

### Task 9: Deploy candidate with SSM health gate and image rollback

**Files:**
- Modify: `infrastructure/aws/deploy-aws.sh`
- Create: `infrastructure/aws/deploy-on-host.sh`
- Create: `infrastructure/aws/tests/deploy-aws.test.sh`
- Create: `infrastructure/aws/tests/deploy-on-host.test.sh`

**Interfaces:**
- Consumes: Task 8 outputs including `ArtifactBucketName`; SSM Run Command; `/etc/caring-iggy/current-image-tag`; `/etc/caring-iggy/candidate-image-tag`; application origin from Elastic IP; committed files below `infrastructure/aws` selected through `git ls-files`.
- Produces: private artifact upload/download/install plus release promotion behavior. Successful tag is written atomically only after host container health, first-admin bootstrap, and operator-side public HTTPS verification pass; failures restore the previous successful tag and run Compose with it.

- [ ] **Step 1: Add failing candidate/promotion tests**

Extend `deploy-aws.test.sh` with stub S3/SSM/curl status and output responses, and create `deploy-on-host.test.sh` with stub Docker Compose. Assert the local deploy packages only committed allowlisted runtime files, uploads under `deployments/` with a random key, sends bucket/key/SHA-256 but no secret through SSM, and deletes the object on success or failure. Assert the minimal SSM bootstrap rejects an invalid bucket/key/checksum, downloads and verifies the archive before extraction, rejects unsafe archive members, then invokes the archive's own `deploy-on-host.sh install` command. Assert host installation is atomic, saves the current tag before changing candidate, promotes only after every service is healthy, administrator bootstrap succeeds, and operator-side `curl --fail --silent --show-error` to the allocated Elastic IP succeeds. Assert failed health/HTTPS restores the old tag; a first release with no prior tag reports rollback unavailable and leaves candidate unpromoted. Expected: FAIL because host rollout script is absent.

- [ ] **Step 2: Implement host-side immutable tag files and release phases**

`deploy-on-host.sh install SOURCE_DIR` validates that the already-verified extracted directory contains exactly the allowlisted runtime files, then atomically installs Compose/Caddy/Kong/scripts/systemd files and writes non-secret `deployment.env`. It enables `caring-iggy.service` only after installation. `deploy-on-host.sh release TAG` validates `^sha-[0-9a-f]{12}$`, reads the current tag, writes the candidate tag, initializes databases, runs Compose pull/up/wait, checks every container health status, runs `bootstrap-admin.sh` after user-service Flyway completion, and reports ready without promoting. A separate `promote TAG` command atomically makes the already-ready candidate current; `rollback` restores the prior tag and Compose. All paths emit concise status without secret values.

- [ ] **Step 3: Implement SSM rollout and operator outputs**

Update `deploy-aws.sh` to build a deterministic tar archive from an explicit allowlist intersected with `git ls-files`, reject dirty or untracked archive inputs, calculate SHA-256, upload it to `s3://$ArtifactBucketName/deployments/$random_key`, and register an EXIT trap that deletes that object. Wait for EC2 SSM registration and retrieve the current successful tag before host configuration changes. For first and later installs, send one minimal inline SSM bootstrap that accepts only a validated bucket name, `deployments/` object key, and 64-character lowercase SHA-256; downloads with the instance role into a mode-0700 temporary directory; verifies the digest; rejects absolute paths, `..` traversal, symlinks, hard links, devices, and non-allowlisted members before extraction; then runs the extracted `deploy-on-host.sh install SOURCE_DIR` and release command. Poll `get-command-invocation` until terminal status. After host readiness, verify public HTTPS locally against `https://` plus the Elastic IP, including trusted issuer and future expiry; then issue the separate promote command. Any failed host or public check issues rollback and exits nonzero. Print stack name, Elastic IP, HTTPS URL, successful image tag, application secret ARN, administrator-email field name, and exact password-retrieval and rollback commands. Do not pass secrets in SSM parameters or shell arguments.

- [ ] **Step 4: Verify success and failure branches**

Run:

```bash
bash -n infrastructure/aws/deploy-aws.sh infrastructure/aws/deploy-on-host.sh
shellcheck infrastructure/aws/deploy-aws.sh infrastructure/aws/deploy-on-host.sh
bash infrastructure/aws/tests/deploy-aws.test.sh
bash infrastructure/aws/tests/deploy-on-host.test.sh
```

Expected: archive digest/path policy passes; uploaded objects are deleted on every exit; candidate success promotes exactly once after external HTTPS; failed install/health/HTTPS restores old tag; no prior tag remains unpromoted; SSM failure returns nonzero and output contains no secret fixture.

- [ ] **Step 5: Commit SSM release and rollback**

```bash
git add infrastructure/aws/deploy-aws.sh infrastructure/aws/deploy-on-host.sh infrastructure/aws/tests/deploy-aws.test.sh infrastructure/aws/tests/deploy-on-host.test.sh
git commit -m "feat: roll out and restore immutable AWS releases"
```

## Phase 4 — CI validation, load verification, and operator runbook

### Task 10: Add CI checks for scripts, Compose, CloudFormation, migrations, and images

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/docker-publish.yml`
- Create: `infrastructure/aws/tests/secret-scan.test.sh`
- Create: `infrastructure/aws/tests/ci-contract.test.sh`

**Interfaces:**
- Consumes: all script/static tests from prior tasks; existing Java, TypeScript, API, Kong, and Playwright jobs; DockerHub public image tags.
- Produces: CI jobs for shell syntax/ShellCheck/tests, production Compose, cfn-lint/template validation, migration-data assertions, tracked-secret scanning, and Trivy critical vulnerability gate. GitHub receives no AWS permissions or credentials.

- [ ] **Step 1: Add CI contract tests and run red locally**

`secret-scan.test.sh` fails if tracked files under `infrastructure/aws` or `backend/*/src/main/resources/db/migration` contain private key PEM headers, AWS access key patterns, known fixture passwords, or `latest` production images. `ci-contract.test.sh` parses workflow YAML and asserts no `id-token: write`, no AWS secret references, required shell/cfn/Compose tests are present, and Docker publish still emits `sha-${GITHUB_SHA::12}` public tags. Expected before workflow edits: FAIL because new CI steps are absent.

- [ ] **Step 2: Add a standalone infrastructure validation job**

In `.github/workflows/ci.yml`, install ShellCheck, `jq`, Docker Compose v2.30 or later, cfn-lint, and Trivy; run `bash -n`, every `infrastructure/aws/tests/*.test.sh`, `cfn-lint`, production Compose validation through `production-compose.test.sh`, and secret scans. Keep existing backend, frontend, Kong, and Playwright jobs; ensure local dev location remains enabled through Compose.

- [ ] **Step 3: Add pinned-image vulnerability gate to build workflow**

In `.github/workflows/docker-publish.yml`, after each successful public image build/push, scan that exact immutable application tag with Trivy and fail on unfixed critical findings. Scan pinned Caddy and Kong digests in CI infrastructure job. Do not add AWS deployment steps, credentials, OIDC, or automatic production deploy.

- [ ] **Step 4: Run CI contract and existing suites**

Run locally:

```bash
bash infrastructure/aws/tests/secret-scan.test.sh
bash infrastructure/aws/tests/ci-contract.test.sh
bash infrastructure/aws/tests/migration-data.test.sh
bash infrastructure/aws/tests/production-compose.test.sh
bash infrastructure/aws/tests/template.test.sh
```

Expected: all contract checks PASS; workflow diff preserves existing public DockerHub `sha-` tag behavior and adds no AWS credentials or automatic production deploy.

- [ ] **Step 5: Commit CI validation**

```bash
git add .github/workflows/ci.yml .github/workflows/docker-publish.yml infrastructure/aws/tests/secret-scan.test.sh infrastructure/aws/tests/ci-contract.test.sh
git commit -m "ci: validate AWS deployment artifacts"
```

### Task 11: Add reproducible capacity test and disposable fixtures

**Files:**
- Create: `infrastructure/aws/load/k6.js`
- Create: `infrastructure/aws/load/create-fixtures.sh`
- Create: `infrastructure/aws/load/delete-fixtures.sh`
- Create: `infrastructure/aws/load/load-test.sh`
- Create: `infrastructure/aws/tests/load-profile.test.sh`

**Interfaces:**
- Consumes: `BASE_URL`, disposable stack application-secret ARN, initial-admin credentials retrieved directly from Secrets Manager for fixture setup, k6 container image, and disposable accounts/animals/adopters created through application API; never writes fixtures through Flyway.
- Produces: reproducible test profile: 60% public animal list/detail reads, 20% authenticated adopter/dashboard reads, 10% interest writes, 10% staff/admin reads and writes; one-second wait between completed request groups; sustained 300 VUs (2m ramp, 10m hold, 1m ramp-down), then 700 VUs (1m ramp from 300, 2m hold, 1m ramp-down); 5xx/check rate <1%, p95 <2s, p99 <5s.

- [ ] **Step 1: Add profile contract test**

Create `load-profile.test.sh` to parse `k6.js` options and assert the exact VU stages, mix weights, one-second sleep, status/check thresholds, p95/p99 thresholds, and exclusion of login endpoint traffic. Expected: FAIL because test profile is absent.

- [ ] **Step 2: Implement test-only fixture lifecycle scripts**

`create-fixtures.sh` requires a stack tagged `Purpose=disposable`, retrieves initial-admin email/password from that stack's application secret into a mode-0600 temporary file, logs in, creates uniquely prefixed load accounts plus representative animals/adopters, and records returned IDs/generated credentials in that file. It prints only fixture count. `delete-fixtures.sh` consumes the file, deletes each created record through the API, and removes the file. Both scripts require `CI_LOAD_TEST=true`, refuse non-HTTPS `BASE_URL`, never touch seed migrations, never accept credentials in command arguments, and redact secret values from all output.

- [ ] **Step 3: Implement k6 profile and container runner**

In `k6.js`, use `ramping-vus` stages for the specified sustained and burst schedules, maintain separate authenticated sessions for adopter and staff users, randomize animal IDs within fixture set, use `sleep(1)` once per request group, and report `http_req_failed`, `checks`, `http_req_duration p(95)/p(99)`. `load-test.sh` creates fixtures, runs pinned `grafana/k6` container on host network against `BASE_URL`, and uses an `EXIT` trap to delete fixtures even on failure.

- [ ] **Step 4: Verify load profile and static scripts**

Run:

```bash
bash -n infrastructure/aws/load/*.sh
shellcheck infrastructure/aws/load/*.sh
bash infrastructure/aws/tests/load-profile.test.sh
```

Expected: exact load shape test PASS; fixture scripts reject unsafe mode and do not contain hard-coded production identities.

- [ ] **Step 5: Commit capacity harness**

```bash
git add infrastructure/aws/load infrastructure/aws/tests/load-profile.test.sh
git commit -m "test: add AWS capacity verification harness"
```

### Task 12: Document deployment, rollback, recovery, and disposable AWS acceptance

**Files:**
- Modify: `README.md`
- Create: `infrastructure/aws/README.md`
- Create: `infrastructure/aws/disposable-verification.sh`
- Create: `infrastructure/aws/tests/disposable-verification.test.sh`

**Interfaces:**
- Consumes: `deploy-aws.sh`, CloudFormation outputs, SSM, load harness, and explicit operator values for AWS account, DockerHub owner, disposable stack name, and a disposable-test budget ceiling.
- Produces: exact manual deployment and rollback instructions, troubleshooting through SSM, safe two-step decommissioning, and a disposable-stack verifier covering external ports, HTTPS/redirect, service/database isolation, health, reboot, bad-image rollback, and RDS point-in-time restore.

- [ ] **Step 1: Add disposable verification contract tests**

Create `disposable-verification.test.sh` with fake AWS/SSM/curl commands. Assert the verifier checks only TCP 80/443 as reachable, 80 redirects to 443, browser-trusted TLS and renewed certificate issuer/expiry, all Compose health states, per-database role grants, reboot recovery, bad-tag rollback, and successful PITR into a separate disposable RDS instance. Assert cleanup never disables deletion protection or deletes the stack automatically. Expected: FAIL because verifier is absent.

- [ ] **Step 2: Write exact operator runbook**

In `infrastructure/aws/README.md`, document required local tools, DockerHub image publication, exact `deploy-aws.sh --stack-name caring-iggy-production --stack-purpose production --image-owner YOUR_DOCKERHUB_OWNER --image-tag sha-0123456789ab --admin-email admin@example.org --region eu-west-2` syntax, outputs, direct Secrets Manager command that selects `.initialAdmin.passwordHex` without echoing it into deployment logs, S3 artifact lifecycle, SSM log inspection, rollback command, secret recovery behavior, cert renewal, RDS point-in-time restore to a new endpoint, cost review, monthly Kong CVE review, load command, and manual decommission sequence: confirm data snapshot plan, update stack with deletion protection disabled, verify change set, empty only the named stack-owned artifact bucket after explicit confirmation, then separately delete the stack to create the final RDS snapshot. State no `destroy` command exists.

- [ ] **Step 3: Implement disposable AWS verification sequence**

Implement `disposable-verification.sh --stack-name NAME --budget-ceiling-usd AMOUNT` to require `eu-west-2`, confirm caller account and named stack, print resource types and a monthly estimate, require that live stack is tagged `Purpose=disposable`, run public port/TLS checks, SSM health/database/reboot/rollback checks, create a PITR restore in a separately named temporary DB instance, verify it, and emit a cleanup checklist that retains stack and deletion protection for human review. The script does not delete resources, modify RDS protection, or change production stack state.

- [ ] **Step 4: Document and execute acceptance checklist**

Run:

```bash
bash -n infrastructure/aws/disposable-verification.sh
shellcheck infrastructure/aws/disposable-verification.sh
bash infrastructure/aws/tests/disposable-verification.test.sh
```

Expected: safety contract passes. With `DOCKERHUB_USERNAME` set, deploy a tagged disposable stack using `./infrastructure/aws/deploy-aws.sh --stack-name caring-iggy-disposable --stack-purpose disposable --image-owner "$DOCKERHUB_USERNAME" --image-tag "sha-$(git rev-parse --short=12 HEAD)" --admin-email admin@example.org --region eu-west-2`, then run `./infrastructure/aws/disposable-verification.sh --stack-name caring-iggy-disposable --budget-ceiling-usd 100` and `./infrastructure/aws/load/load-test.sh`. Keep the stack online for 8 days and confirm a changed TLS certificate serial and future expiry. Acceptance requires all architecture checks, reboot, rollback, PITR, 300-user and 700-user targets, trusted renewed IP certificate, 5xx/check thresholds, p95/p99 limits, and no OOM or health failure.

- [ ] **Step 5: Run complete local regression and finalize runbook**

Run:

```bash
cd backend && mvn -B clean verify
cd ../frontend && npm ci && npm run lint -- --max-warnings=0 && npm run typecheck && npm run test:unit
cd ..
bash infrastructure/kong/bootstrap-keys.sh
docker compose -f infrastructure/docker-compose.yml up -d --build --wait kong
cd frontend && npx playwright test --project=setup --project=api --project=infra
```

Expected: backend, frontend, local Compose, API, and Kong regression checks pass; local dev fixtures remain available; no AWS credentials are required by GitHub Actions. Record actual disposable-stack and load results in `infrastructure/aws/README.md`, including any observed tuning needed to meet 4 GiB acceptance.

- [ ] **Step 6: Commit operational handoff**

```bash
git add README.md infrastructure/aws/README.md infrastructure/aws/disposable-verification.sh infrastructure/aws/tests/disposable-verification.test.sh
git commit -m "docs: add AWS deployment and recovery runbook"
```
