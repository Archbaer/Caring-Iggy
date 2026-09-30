# Simple AWS Deployment Design

Date: 2026-09-28
Status: Approved

## 1. Purpose

Deploy Caring Iggy to AWS with a small, understandable production footprint. Initial deployment must be inexpensive, reproducible, secure by default, and operable without a dedicated platform team.

Success means:

- One command deploys or updates infrastructure and application containers.
- Only TCP 443 serves application content; TCP 80 serves redirects and ACME challenges only.
- Production secrets never enter Git or persistent production `.env` files.
- Production databases contain no demo or test identities.
- EC2 reboot restores the stack without manual intervention.
- Failed application releases roll back to the previous immutable image tag.
- RDS provides encrypted storage, seven-day point-in-time recovery, and deletion protection.
- A 4 GiB EC2 host survives 300 concurrent users for 10 minutes and a 700-user burst for 2 minutes without OOM, failed health checks, or an HTTP 5xx rate of 1% or greater.

## 2. Scope

This design includes:

- AWS infrastructure expressed in CloudFormation.
- One EC2 application host.
- One RDS PostgreSQL 15 instance with three logical databases.
- One private, encrypted S3 bucket used only to transport versioned deployment artifacts to EC2.
- Caddy, Next.js, Kong, and five Spring Boot services under Docker Compose.
- Secrets Manager integration.
- SSM-based administration and deployment.
- Production database initialization, runtime configuration, health checks, restart policy, logs, backups, rollback, CI validation, and a deployment runbook.
- Required application and migration changes for safe production deployment.

This design excludes:

- ECS, EKS, Kubernetes, Lambda bootstrap, ALB, autoscaling, NAT Gateway, Redis, a separate monitoring/logging server, and automatic GitHub production deployment.
- Multi-host high availability.
- Automatic secret rotation.
- A permanent domain during the first temporary deployment.

These exclusions keep the first deployment readable and affordable. They can be revisited after measured load or availability requirements justify them.

## 3. System architecture

The deployment uses `eu-west-2` and one CloudFormation stack.

### Compute

- One x86_64 EC2 `t3.medium`: 2 vCPU and 4 GiB RAM.
- Amazon Linux 2023, selected through the AWS public SSM AMI parameter rather than a hard-coded AMI ID.
- 40 GiB encrypted gp3 root volume.
- Elastic IP for a stable temporary public address.
- No SSH key pair and no inbound port 22.
- Systems Manager Session Manager and Run Command for administration.

### Database

- One Single-AZ RDS PostgreSQL 15 `db.t4g.small`: 2 vCPU and 2 GiB RAM.
- 20 GiB encrypted gp3 storage.
- No public address.
- Seven-day automated backup retention and point-in-time recovery.
- Deletion protection enabled.
- `DeletionPolicy: Snapshot` and `UpdateReplacePolicy: Snapshot` protect data when deletion or replacement is explicitly allowed.

Deletion protection intentionally blocks ordinary stack deletion and RDS replacement. `deploy-aws.sh` inspects the CloudFormation change set and refuses any RDS replacement. Decommissioning requires a documented two-step operation: first update the stack to disable RDS deletion protection after explicit confirmation, then delete the stack so CloudFormation creates the final snapshot. There is no automatic destroy path.

RDS contains three logical databases:

- `animals_db`
- `users_db`
- `adopters_db`

Each database has a distinct owner/login and password. Services receive only their own database credential.

### Runtime containers

One production Compose project runs:

- Caddy 2.11.4
- Next.js frontend/BFF
- Kong OSS 3.9.3 in DB-less mode
- `animal-service`
- `adopter-service`
- `user-service`
- `matching-service`
- `reporting-service`

All third-party and application images use immutable versions. Application images use the existing public DockerHub tags formed from `sha-` plus the first 12 Git commit characters. Caddy and Kong tags are pinned to verified image digests in the implementation PR. `latest` is never a production input.

## 4. Request and service data flow

Public request flow:

1. Browser connects to Caddy on TCP 443.
2. Caddy terminates TLS, overwrites forwarding headers, and proxies to Next.js on the internal edge network.
3. Next.js BFF validates session/CSRF state and calls Kong at `http://kong:8000`.
4. Kong applies JWT validation and rate limits, then calls the target Spring service.

Internal flow:

- Matching and reporting services call animal/adopter services directly through Docker service DNS.
- User service calls adopter service directly.
- Spring resource servers obtain JWKS directly from user service.
- Internal Spring calls never traverse Kong.
- Browsers never connect directly to Kong or Spring services.

Database flow:

- Animal, user, and adopter services connect to the same private RDS endpoint over PostgreSQL TLS.
- Each service selects its own database name and credential.
- Matching and reporting services remain stateless and do not connect to PostgreSQL.

## 5. Network design

CloudFormation creates a dedicated VPC containing:

- One public subnet for EC2.
- Two private subnets in different Availability Zones for the RDS subnet group.
- One internet gateway and a public route for EC2.
- No NAT Gateway.

Security groups enforce:

- EC2 inbound TCP 80 and 443 from the internet.
- No public SSH, frontend, Kong, Spring, or PostgreSQL ports.
- RDS inbound TCP 5432 only from the EC2 security group.
- RDS private subnets have no route to the internet gateway.

EC2 uses its Elastic IP and internet gateway for public traffic, Docker image pulls, AWS API access, and SSM. RDS does not need outbound internet access.

The EC2 instance requires IMDSv2. Its IAM role includes SSM managed-instance permissions, least-privilege reads for the two deployment secrets, and `s3:GetObject` for only the stack-owned deployment-artifact bucket prefix. It does not receive broad Secrets Manager, S3, or CloudFormation permissions.

The stack-owned deployment-artifact bucket blocks all public access, uses server-side encryption, and expires objects after one day. `deploy-aws.sh` uploads one archive containing only committed AWS runtime files under a random object key. The SSM command tells EC2 which object key to download; it never embeds file contents or secrets. The deploy script deletes the object after success or failure, while the lifecycle rule removes abandoned objects.

## 6. TLS and public origin

Caddy is the only container publishing host ports. It redirects HTTP to HTTPS and proxies HTTPS to `frontend:3000`.

The temporary deployment uses the Elastic IP as its HTTPS origin. Caddy explicitly requests a short-lived IP-address certificate from Let's Encrypt at `https://acme-v02.api.letsencrypt.org/directory` using the `shortlived` profile. No fallback issuer is configured because another issuer could silently lack the required IP-certificate profile. Caddy's `/data` volume persists certificate state across container restarts.

If the browser-trusted IP certificate cannot be issued or renewed, deployment health verification fails. The system never falls back to authenticated plain HTTP or a browser-untrusted self-signed certificate. The disposable stack stays online for eight days to cover at least one complete short-lived certificate renewal cycle, and verification checks the renewed certificate's changed serial number, issuer, and future expiry before production acceptance.

Runtime configuration sets:

- `APP_ORIGIN` is `https://` followed by the allocated Elastic IP.
- `TRUST_PROXY_HEADERS=true`
- `KONG_URL=http://kong:8000`
- `AUTH_SESSION_COOKIE_SECURE=true`

When a domain becomes available, only the Caddy site address and `APP_ORIGIN` change. Application topology remains unchanged.

## 7. Secrets design

CloudFormation creates an application secret container in Secrets Manager. RDS creates and manages its master credential in a separate Secrets Manager secret.

The application secret is one JSON bundle containing:

- JWT PKCS#8 private key, public key, and key ID.
- Frontend session-state HMAC secret.
- Frontend CSRF HMAC secret.
- Three database usernames and independent generated passwords.
- Initial administrator email and generated high-entropy password.

`deploy-aws.sh` generates the application bundle only when no current secret value exists. It uses a mode-0700 temporary directory, mode-0600 files, `umask 077`, and cleanup traps. The AWS CLI receives a file path, not secret contents in command arguments. Ordinary deployments never regenerate or rotate secrets.

On EC2, a root-only preparation script:

1. Retrieves both Secrets Manager values through the instance role.
2. Writes per-service runtime environment files under `/run/caring-iggy`.
3. Renders `/run/caring-iggy/kong.yml` from a committed template using only the JWT public key.
4. Starts Compose.

The script creates `/run/caring-iggy` with mode 0700 under `umask 077`, writes secret-bearing files with mode 0600, and verifies modes before Compose starts. Non-secret generated files live separately and may be world-readable when required by their container. `/run` is memory-backed and recreated after reboot. No secret-bearing production `.env` file persists on disk. A persistent `/etc/caring-iggy/deployment.env` is allowed only for non-secret values such as image owner, immutable image tag, RDS endpoint, Elastic IP, and AWS region.

The JWT private key reaches only user service. The public key reaches user service and generated Kong configuration. Frontend HMAC values remain stable across restarts.

Secret rotation is an explicit later operation. JWT rotation must publish old and new verification keys concurrently until all tokens signed by the old key expire.

### Initial administrator

Initial deployment requires `--admin-email`. When the application secret has no current value, `deploy-aws.sh` stores that email plus a generated high-entropy password in the application secret. No administrator identity, password, UUID, or password hash is committed to Git.

After Flyway completes, a root-only, idempotent bootstrap script creates the first real `ADMIN` account through a parameterized SQL transaction. Database initialization enables PostgreSQL `pgcrypto` in `users_db`; the bootstrap hashes the generated password with bcrypt cost 12 inside PostgreSQL. If that email already owns an `ADMIN` account, the script succeeds without changing it. If any different `ADMIN` already exists, the script refuses to create another. Deploy output identifies the secret, and the runbook gives an explicit AWS CLI command for the operator to retrieve the password directly from Secrets Manager; scripts never print it.

## 8. Database initialization and migrations

Before application startup, an idempotent initializer runs from EC2 using an ephemeral PostgreSQL client container. It obtains the RDS master credential and:

- Creates the three databases when absent.
- Creates the three application login roles when absent.
- Reconciles generated passwords without printing them.
- Makes each role owner of only its assigned database.
- Revokes `CONNECT` from `PUBLIC` on all three databases.
- Grants `CONNECT` only to the matching application role for each database.
- Revokes unnecessary public schema privileges inside each database.
- Verifies each role can connect to its assigned database and cannot connect to either other application database.

Application JDBC connections include `sslmode=require`. Flyway then creates application schemas using each database owner.

### Production data policy

Production starts empty except for schema-required lookup/reference rows and the generated first administrator described above. Demo animals, adopters, employees, accounts, and known passwords are forbidden.

Current seed migrations are separated before deployment:

- Main `classpath:db/migration` contains schema and required reference data only.
- Idempotent repeatable scripts under `classpath:db/dev` contain local/CI demo and test data.
- Local Compose and CI explicitly add `classpath:db/dev` to Flyway locations.
- Production uses only `classpath:db/migration`.

Because no production database exists yet, disposable local volumes may be reset once during this migration cleanup. After production launch, applied versioned migrations are immutable. Destructive database changes require expand/migrate/contract releases so application rollback remains possible.

## 9. Application compatibility changes

### Backend

- Upgrade Spring Boot from 3.2.0 to 4.1.0.
- Upgrade Spring Cloud from 2023.0.0 to 2025.1.2.
- Update incompatible managed or explicit dependencies discovered by the build.
- Keep Java 17 unless the upgraded dependency baseline requires a higher version.
- Make Hikari settings configurable and launch with maximum pool size 5 and minimum idle 1 for each DB-backed service.
- Use `INFO` application and JDBC logging in production.
- Keep actuator health endpoints internal.
- Configure JVM/container memory bounds so five JVMs cannot exhaust the 4 GiB host.

The Spring upgrade is isolated and fully tested before AWS infrastructure changes.

### Frontend

The current standalone, non-root production image remains the base. Production supplies exact origin, proxy-trust, Kong URL, and HMAC secrets at runtime. Frontend port 3000 is not published on the host.

The initial health check may use `/`. If verification shows that route performs downstream work, add a dedicated lightweight health route that proves the Next.js process is ready without querying Kong or RDS.

### Kong

- Upgrade free OSS image from 3.6 to 3.9.3.
- Pin the verified amd64 image digest.
- Keep DB-less mode and `policy: local` rate limits for the single instance.
- Do not expose proxy or admin ports on the host.
- Remove production CORS because the browser communicates only with Next.js.
- Restrict trusted proxy addresses to the dedicated frontend/Kong Docker subnet.

If Kong is replicated later, local rate-limit counters must be replaced or the multiplied quota must be accepted explicitly.

## 10. Production Compose design

Keep `infrastructure/docker-compose.yml` for local development and CI. Add a separate `infrastructure/aws/docker-compose.prod.yml` that:

- Uses published images and an immutable application tag.
- Contains no PostgreSQL services or source builds.
- Publishes only Caddy ports 80/443.
- Omits fixed `container_name` values.
- Applies `restart: unless-stopped` to long-running containers.
- Applies Docker `json-file` rotation with `max-size: 10m` and `max-file: 3`.
- Retains service health checks and adds JVM startup grace periods.
- Adds tested memory limits and JVM settings.
- Mounts generated Kong configuration read-only.
- Persists Caddy `/data` and `/config` named volumes.
- Uses separate internal edge and backend networks.

Initial memory budgets are implementation parameters verified by load testing, not promises of usable Java heap. Their total plus Docker and OS overhead must fit within 4 GiB without swap-driven instability.

## 11. Provisioning and deployment flow

`infrastructure/aws/deploy-aws.sh` is the single operator entrypoint. Initial deployment and updates follow the same flow:

1. Validate AWS CLI, authenticated account, `eu-west-2`, Docker image owner, and immutable image tag.
2. Run local shell, Compose, and CloudFormation validation.
3. Package only committed AWS runtime files into a versioned archive.
4. Deploy or update the CloudFormation stack.
5. Create the application secret value only when absent.
6. Wait for stack resources and SSM registration.
7. Upload the archive to the private stack-owned artifact bucket under a random key.
8. Read and preserve the currently successful image tag before changing any host file or candidate value.
9. Use SSM Run Command to download the exact archive, install/update host runtime files, and set a separate candidate tag.
10. Run idempotent database initialization.
11. Pull candidate images and run `docker compose up -d` against the candidate configuration.
12. Wait for container health, then create or verify the initial administrator after Flyway completes.
13. Verify public HTTPS from the operator machine.
14. Atomically promote the candidate tag to the current successful tag.
15. Delete the uploaded archive and print non-secret deployment outputs plus the rollback command.

No Lambda bootstrap is used. EC2 user data stays short: install Docker/Compose and AWS CLI prerequisites, enable Docker, and create required directories. Versioned scripts and the systemd unit arrive through the private deployment archive and are installed/enabled by the SSM rollout. Application deployment logic lives in committed scripts, not a large CloudFormation user-data block.

The systemd unit regenerates runtime configuration and starts Compose after network and Docker availability. Secret retrieval, DNS, DockerHub pulls, and RDS readiness use six bounded exponential-backoff attempts. If preparation still fails, systemd uses `Restart=on-failure` with a five-minute delay so a transient external outage does not permanently prevent boot recovery or create a tight retry loop. A successful preparation resets the failure state. EC2 reboot therefore restores the stack without manual action once dependencies recover.

Deployment remains manual for the first release. GitHub Actions continues building public DockerHub images but receives no AWS credentials. AWS OIDC/CD can be designed after the manual path is proven.

## 12. Failure handling and rollback

- CloudFormation failure stops deployment and preserves the last successful stack state.
- Missing secrets, failed database initialization, image pull failure, unhealthy containers, or failed HTTPS verification returns non-zero.
- Scripts never enable shell tracing around secret operations and never print secret payloads.
- SSM command output includes concise diagnostics but no environment dumps.
- Before changing any host tag/configuration, deployment records the previous immutable tag. Candidate and current tags remain separate until health verification succeeds.
- Failed post-deploy health verification restores the previous tag and reruns Compose.
- Database schema is never automatically rolled back. Application migrations must remain backward-compatible with the previous image.
- RDS outages mark DB-backed services unhealthy. Restart policies handle process crashes; they do not deliberately restart healthy processes merely because an external dependency is unavailable.
- EC2 is disposable. Rebuild it through CloudFormation rather than restoring application files.

## 13. Logs, backups, and operational access

All applications log to stdout/stderr. Docker rotation bounds local disk use to three 10 MiB files per container. Operators inspect logs through SSM with `docker compose logs`; no application log database or CloudWatch Logs agent is added initially.

RDS automated backups provide seven-day point-in-time recovery. A restore creates a new RDS instance for verification before any endpoint switch. EC2 needs no data backup because configuration is committed, secrets are in Secrets Manager, and application data is in RDS. Caddy certificate state may be regenerated if the host is replaced.

No monitoring stack is part of the initial design. Deployment health checks and AWS service status provide the initial operational signal. This knowingly means an outage between operator checks may go unnoticed; operators check the public health endpoint after each deployment and during active support. Monitoring becomes a separate design when traffic or support needs justify it.

## 14. CI and verification

Existing Java, TypeScript, unit, API, Kong, and Playwright suites remain required.

New CI checks cover:

- `bash -n` and ShellCheck for deployment scripts.
- Focused shell tests for idempotency, secret redaction, and rollback decisions.
- `docker compose config` for production Compose using non-secret fixtures.
- `cfn-lint` and CloudFormation template validation.
- Migration tests proving production gets schema-only data and dev/CI gets fixtures.
- Secret scanning proving no AWS credentials, passwords, private keys, or generated runtime files are tracked.
- Trivy image scanning that blocks deployment for an unfixed critical vulnerability in application, Caddy, or Kong images.

A disposable AWS stack must prove:

- Only TCP 80/443 are internet-reachable.
- HTTPS is browser-trusted and HTTP redirects to HTTPS.
- Kong, frontend, Spring, PostgreSQL, and SSH ports are not public.
- Each application role connects to only its intended database.
- All containers become healthy.
- EC2 reboot restores the healthy stack.
- A bad image tag or failed health check restores the previous tag.
- RDS point-in-time restore succeeds to a disposable database instance.

Load verification uses open-source k6 from a container, not another AWS service:

- A disposable fixture command creates dedicated load-test accounts and representative animals/adopters, then removes them after the test; Flyway never owns these fixtures.
- Timed traffic excludes login brute-force testing and reuses prepared authenticated sessions so Kong's deliberate login rate limit does not distort application capacity.
- Request mix is 60% public animal list/detail reads, 20% authenticated adopter/dashboard reads, 10% interest writes, and 10% staff/admin reads and writes.
- Each virtual user waits one second between completed request groups.
- Sustained test ramps to 300 concurrent virtual users over two minutes, holds for 10 minutes, then ramps down over one minute.
- Burst test ramps from 300 to 700 concurrent virtual users over one minute, holds for 2 minutes, then ramps down over one minute.
- No OOM kill or failed health check.
- HTTP 5xx responses remain below 1% of load-test requests.
- k6 check failures remain below 1%, p95 request latency remains below 2 seconds, and p99 remains below 5 seconds.

If the 4 GiB host fails, first tune measured JVM/container budgets; resize only when evidence shows tuning is insufficient. Test client capacity is verified separately so load-generator saturation cannot masquerade as application capacity.

## 15. Planned repository additions and changes

Expected new files:

- `infrastructure/aws/template.yml`
- `infrastructure/aws/deploy-aws.sh`
- `infrastructure/aws/docker-compose.prod.yml`
- `infrastructure/aws/Caddyfile.template`
- `infrastructure/aws/kong.prod.yml.template`
- `infrastructure/aws/prepare-runtime.sh`
- `infrastructure/aws/init-databases.sh`
- `infrastructure/aws/bootstrap-admin.sh`
- `infrastructure/aws/caring-iggy.service`
- Infrastructure script tests and load-test files.

Expected existing-file changes:

- Backend parent POM and affected service dependencies for supported Spring versions.
- Flyway seed locations and local/CI environment settings.
- Backend application configuration for pool sizing, logging, DB TLS, cookies, and health.
- Local Kong image/version after compatibility verification.
- Docker publishing/CI validation where needed.
- README deployment and recovery runbook.

The user's unrelated local `.gitignore` modification remains untouched.

## 16. Cost and scaling boundary

Initial fixed infrastructure remains approximately USD 70–80 per month before VAT, unusual data transfer, snapshots beyond included backup allocation, or burst CPU credit charges. Exact cost is checked before stack creation.

This design intentionally provides no multi-instance availability. Scale-out later requires a new design covering ALB/ACM, multiple EC2 instances, shared Kong rate-limit state or accepted per-node limits, automated image rollout, and stronger monitoring. Shared RDS sessions and stable application secrets already avoid a sticky-session requirement.

Kong OSS 3.9.3 has no current LTS guarantee. The project accepts community-maintained OSS for this first deployment, runs Trivy before deployment, and reviews Kong releases and published CVEs monthly. Any unpatched critical Kong vulnerability blocks deployment and triggers an explicit upgrade, maintained-fork evaluation, or gateway replacement decision.
