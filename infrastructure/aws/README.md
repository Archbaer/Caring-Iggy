# AWS deployment and recovery runbook

This runbook covers the single-host AWS stack for Caring Iggy. All commands and flags are taken from the scripts in this directory; do not copy commands without checking them against the current version of those scripts.

**Acceptance status:** repository implementation and local contracts have been exercised. No live AWS acceptance has been performed. Disposable deployment, browser-trusted IP TLS and 8-day renewal, EC2 reboot recovery, failed-release rollback, RDS PITR, and measured 300/700-user capacity remain pending. Do not treat the local tests as production acceptance.

## 1. Overview

The CloudFormation template (`template.yml`) provisions:

- one EC2 `t3.medium` application host in `eu-west-2`
- one RDS PostgreSQL 15 `db.t4g.small` instance with encryption, 7-day backups, and deletion protection
- a VPC with public and private database subnets, an Elastic IP, and an S3 artifact bucket
- an IAM instance profile with SSM access plus scoped reads of the two stack secrets and its S3 artifact prefix

The application host runs Docker Compose with Caddy as the only public-facing service. Caddy listens on TCP 80 and 443; the security group does not expose 22, 3000, 8000, or 5432. Administration is SSM-only: there is no SSH keypair and no bastion host.

## 2. Required local tools

`deploy-aws.sh` checks for these tools before it runs:

- AWS CLI v2 (`aws --version` must start with `aws-cli/2.`)
- `jq`
- `shellcheck`
- `cfn-lint`
- Docker with Compose v2.30 or later (`docker compose version --short` must be at least `2.30`)
- `bash`, `curl`, `git`, `openssl`, `sha256sum`, `tar`, `tr`, `trivy`

The disposable verifier also requires `awk` and `nc`. Session Manager interactive sessions require the AWS Session Manager plugin. Authenticate the operator account and review an [AWS Pricing Calculator](https://calculator.aws/) estimate for `eu-west-2` before creating the disposable stack. The verifier budget flag is an acknowledgment/gate for an approximate planning estimate, not an AWS spending limit.

The pinned images the deploy script scans are:

- `caddy:2.11.4@sha256:040e9f7480b80b6d4a7e5013a21159b950a63dcbdb956e38abe2387fb28d9ec0`
- `kong:3.9.3@sha256:d56dba2a916b7bb842ec0b5caae3e0956b18afc10119ea90203a41650c01f7c9`
- each `caring-iggy-*` service image at the tag you supply

## 3. DockerHub image publication

Images are built and pushed by `.github/workflows/docker-publish.yml`.

- On pushes to `main`, the workflow selects changed services. A tag starting with `v*` selects every service.
- Every selected service build publishes `sha-${GITHUB_SHA::12}` (for example `sha-0123456789ab`), including git-tag builds.
- Git-tag builds also publish the version string without the leading `v`. Trivy scans the immutable SHA tag after publication.
- The workflow also pushes a `:latest` tag, but **production deploys must never use `latest`**. Always deploy an immutable `sha-` tag.

`deploy-aws.sh` enforces this: `--image-tag` must match `^sha-[0-9a-f]{12}$`.

Wait for the publish workflow to finish and confirm all six service images exist at the chosen SHA tag. A local Git SHA alone does not prove that tag has been published. Runtime artifact inputs must be committed and clean; deployment rejects dirty or untracked runtime files.

## 4. Deploy

### Exact command

```bash
./infrastructure/aws/deploy-aws.sh \
  --stack-name caring-iggy-production \
  --stack-purpose production \
  --image-owner YOUR_DOCKERHUB_OWNER \
  --image-tag sha-0123456789ab \
  --admin-email admin@example.org \
  --region eu-west-2
```

Flags:

- `--stack-name` — CloudFormation stack name (alphanumeric and hyphens, 1–128 characters, must start with a letter)
- `--stack-purpose` — `production` or `disposable`
- `--image-owner` — DockerHub namespace that owns the `caring-iggy-*` images
- `--image-tag` — immutable `sha-` tag (12 lowercase hex digits)
- `--admin-email` — email address for the initial administrator account
- `--region` — must be `eu-west-2`

### What the deploy does and prints

`deploy-aws.sh` runs local preflight checks (shellcheck, cfn-lint, Compose test, secret scan, Trivy critical scans), creates a CloudFormation change set, rejects any change set that would replace RDS or add unexpected ingress rules, uploads a tar of the runtime files to S3, bootstraps the host over SSM, and verifies public HTTPS before promoting the release.

On success it prints:

```text
AWS deployment complete
Stack: caring-iggy-production
Elastic IP: 203.0.113.10
HTTPS URL: https://203.0.113.10/
Successful image tag: sha-0123456789ab
Application secret ARN: arn:aws:secretsmanager:eu-west-2:123456789012:secret:...
Administrator email field: initialAdmin.email
Retrieve initial password: aws secretsmanager get-secret-value --region eu-west-2 --secret-id 'arn:aws:secretsmanager:eu-west-2:123456789012:secret:...' --query SecretString --output text | jq -r '.initialAdmin.passwordHex'
Rollback: aws ssm send-command --region eu-west-2 --instance-ids 'i-0123456789abcdef0' --document-name AWS-RunShellScript --parameters 'commands=["bash /opt/caring-iggy/deploy-on-host.sh rollback"]'
```

The first deploy of a stack creates the application secret; subsequent deploys verify that the existing secret's `initialAdmin.email` matches the `--admin-email` flag.

## 5. First-admin password retrieval

Use the command printed by the deploy:

```bash
aws secretsmanager get-secret-value \
  --region eu-west-2 \
  --secret-id 'arn:aws:secretsmanager:eu-west-2:123456789012:secret:...' \
  --query SecretString \
  --output text | jq -r '.initialAdmin.passwordHex'
```

> **Warning:** this value is a plain-text password. Do not echo it into shared logs, chat channels, or CI output. Retrieve it once, store it in a password manager, and treat the command output as sensitive.

`bootstrap-admin.sh` creates the administrator account idempotently from this secret; if an administrator already exists with a different email it aborts.

## 6. S3 artifact lifecycle

The deploy packages only the allowlisted runtime files into a tar and uploads it to the stack's artifact bucket under:

```text
deployments/<stack-name>/<UTC-timestamp>-<16-hex-random>.tar
```

The host verifies the tar's SHA-256 digest before extracting it and validates that every member is on the committed allowlist. `deploy-aws.sh` deletes the S3 object on exit in all cases (success or failure). The bucket also has a lifecycle rule that expires objects under `deployments/` after one day.

## 7. SSM operations

All host interaction goes through AWS Systems Manager Session Manager or `aws ssm send-command`. There is no SSH access.

### List recent commands

```bash
aws ssm list-command-invocations \
  --region eu-west-2 \
  --instance-id i-0123456789abcdef0 \
  --details
```

### Fetch output for a command

```bash
aws ssm get-command-invocation \
  --region eu-west-2 \
  --command-id abcde-12345-67890 \
  --instance-id i-0123456789abcdef0
```

### Read the last 100 lines of Compose logs

```bash
aws ssm send-command \
  --region eu-west-2 \
  --instance-ids i-0123456789abcdef0 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["read -r IMAGE_TAG </etc/caring-iggy/current-image-tag; export IMAGE_TAG; cd /opt/caring-iggy && docker compose --env-file /etc/caring-iggy/deployment.env -f docker-compose.prod.yml logs --tail=100"]'
```

The persistent deployment file omits secret values and the current release tag. Read `current-image-tag` before manual Compose commands; otherwise required `IMAGE_TAG` interpolation fails. In a root SSM session, inspect boot recovery with `systemctl status caring-iggy.service` and `journalctl -u caring-iggy.service --since today`.

## 8. Rollback

The deploy prints a rollback command similar to:

```bash
aws ssm send-command \
  --region eu-west-2 \
  --instance-ids i-0123456789abcdef0 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/caring-iggy/deploy-on-host.sh rollback"]'
```

Host-side semantics in `deploy-on-host.sh`:

- `install` — atomically installs release files under `/opt/caring-iggy` and writes `/etc/caring-iggy/deployment.env`.
- `release <tag>` — pulls the candidate image, runs `prepare-runtime.sh`, `init-databases.sh`, `docker compose up -d --wait`, health checks every service, and `bootstrap-admin.sh`. On success it writes `/etc/caring-iggy/candidate-ready`.
- `promote <tag>` — moves the candidate to `/etc/caring-iggy/current-image-tag` and removes candidate markers.
- `rollback` — reads `/etc/caring-iggy/previous-image-tag`, pulls and starts that image, and moves it back to `current-image-tag`. If there is no previous tag it exits with code 2 and leaves the host on the candidate (or broken) release.

`deploy-aws.sh` automatically invokes rollback if HTTPS verification or promotion fails.

## 9. Secrets

The application secret is create-only on first deploy:

- if the secret has zero `AWSCURRENT` versions, `deploy-aws.sh` generates RSA-3072 JWT keys and 256-bit hex secrets and stores them.
- if the secret has exactly one `AWSCURRENT` version, the script verifies that `initialAdmin.email` matches `--admin-email`.
- if the secret has multiple `AWSCURRENT` versions, the deploy aborts.

Explicit rotation is a separate operator action. `deploy-aws.sh` never rotates secrets automatically. If you rotate secrets:

- database passwords require a coordinated rolling restart so services pick up the new credentials
- JWT keys are shared across services and used to issue/validate sessions; rotating JWT private/public keys while existing sessions or tokens are in flight will invalidate those sessions. Coordinate rotation with session expiry or accept that active users will be logged out.

## 10. TLS

Caddy terminates TLS using the Let's Encrypt `shortlived` ACME profile. The Caddyfile is `infrastructure/aws/Caddyfile.template` and is rendered with `APP_ORIGIN`. Certificate state persists in the `caddy-data` Docker volume, and Caddy handles renewal automatically.

The current deploy script sets `APP_ORIGIN=https://<ElasticIP>`; it has no custom-domain flag. Domain support requires a later deployment-input change as well as an A record and matching Caddy/application origin.

## 11. RDS point-in-time recovery

RDS is configured with a 7-day backup retention period. To restore to a new instance, use the same shape that `disposable-verification.sh` uses:

```bash
aws rds restore-db-instance-to-point-in-time \
  --region eu-west-2 \
  --source-db-instance-identifier caring-iggy-production-db-identifier \
  --target-db-instance-identifier caring-iggy-production-pitr-20260101120000 \
  --use-latest-restorable-time \
  --no-publicly-accessible \
  --deletion-protection \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name caring-iggy-production-db-subnet \
  --copy-tags-to-snapshot

aws rds wait db-instance-available \
  --region eu-west-2 \
  --db-instance-identifier caring-iggy-production-pitr-20260101120000
```

You can also perform the restore through the AWS console: choose the source instance, **Actions → Restore to point in time**, leave **Publicly accessible** disabled, and select the same VPC security groups and DB subnet group as the source.

For a specific recovery time, query the source instance's `EarliestRestorableTime` and `LatestRestorableTime`, then replace `--use-latest-restorable-time` with a timestamp inside that interval. Wall-clock "now" may be newer than the latest restorable backup. A new disposable stack may need time for automated backups to become available. The restored instance incurs separate RDS instance/storage charges until manually removed.

After the restore, verify connectivity and recovered schemas/data through SSM before switching an endpoint. Start a host session:

```bash
aws ssm start-session \
  --region eu-west-2 \
  --target i-0123456789abcdef0
```

In that session, enter a root shell with `sudo bash`, then run the following with the restored endpoint:

```bash
set +x
set -euo pipefail
set -a
. /etc/caring-iggy/deployment.env
set +a
secret=$(aws secretsmanager get-secret-value --region "$AWS_REGION" \
  --secret-id "$RDS_SECRET_ARN" --query SecretString --output text)
export PGUSER PGPASSWORD
PGUSER=$(printf '%s' "$secret" | jq -er '.username')
PGPASSWORD=$(printf '%s' "$secret" | jq -er '.password')
unset secret
docker run --rm --network caring-iggy_backend \
  -e PGUSER -e PGPASSWORD -e PGSSLMODE=require \
  postgres:15-alpine@sha256:25d430274d8a31184f9435cc5b2f56aff254952065bbbcac0c51acedb5a1d1e7 \
  psql -h RESTORED_ENDPOINT -d users_db -c 'SELECT count(*) FROM accounts'
unset PGUSER PGPASSWORD
```

The verifier performs a connectivity check; recovery acceptance also requires comparing expected tables and representative data in all three restored databases. Record the restored endpoint and restore time. Source RDS and CloudFormation remain unchanged; switching to the new database requires an explicit reviewed recovery change. After data review, disable deletion protection only on the restored instance, then delete that instance separately with the agreed final snapshot policy.

## 12. Cost and CVE hygiene

- Review the AWS Pricing Calculator before deployment and the AWS bill monthly. The verifier uses conservative planning inputs for exactly `t3.medium`, `db.t4g.small`, 40/20 GiB storage, public IPv4, and two secrets. Unsupported resource classes fail closed. It prints retained PITR instance cost separately and excludes VAT, data transfer, API requests, extra backups, S3, and burst CPU credits; it is not a quote or spend cap.
- Review the Kong base image for new CVEs monthly. `deploy-aws.sh` blocks critical CVEs with fixes at deploy time, but images age between deploys.
- Keep the pinned Caddy and Kong image hashes under review; update only after testing in a disposable stack.

## 13. Capacity test

The load test runs against a disposable stack from the operator's workstation. It requires `STACK_NAME`, `BASE_URL`, `AWS_REGION`, and `CI_LOAD_TEST=true`:

```bash
export CI_LOAD_TEST=true
export BASE_URL=https://203.0.113.10
export STACK_NAME=caring-iggy-disposable
export AWS_REGION=eu-west-2
./infrastructure/aws/load/load-test.sh
```

`load-test.sh` creates fixtures, runs a k6 container with `infrastructure/aws/load/k6.js`, and deletes fixtures on exit.

To retry ordinary cleanup after an outage, export the same variables plus `K6_FIXTURE_FILE=/absolute/path/to/retained-journal.json`, then run `./infrastructure/aws/load/delete-fixtures.sh`. An unresolved `pendingMutation` needs operator inspection using its unique generated identity; do not delete or clear the journal until that record's outcome is known.

The harness accepts only `BASE_URL=https://<stack ElasticIp>` and validates it before fetching or sending credentials; custom domains are not supported. Cleanup rechecks `Purpose=disposable`, deletes animals and staff profiles through the BFF, then uses SSM and existing private database environment files to remove the exact generated adopter profile/account and orphaned staff account (sessions cascade). Operator IAM needs CloudFormation read, Secrets Manager read, and SSM send/read permissions. Failed cleanup returns nonzero and retains the mode-0600 fixture journal for retry with `STACK_NAME`, `BASE_URL`, `AWS_REGION`, `CI_LOAD_TEST=true`, and `K6_FIXTURE_FILE` pointing to that file. A pending mutation whose completion is ambiguous retains its unique recovery identity in the journal and requires operator recovery before the journal can be removed. SIGINT/SIGTERM stop the active client, run guarded cleanup, and exit 130/143. The profile ramps continuously from 300 to 700 VUs; login setup traffic is excluded from capacity thresholds, and rendered reads check fixture content so HTTP 200 error pages fail. Docker must support host networking; `K6_IMAGE` must pin a release version and SHA-256 digest.

## 14. Disposable acceptance

Run the disposable verifier before any production promotion:

```bash
./infrastructure/aws/deploy-aws.sh \
  --stack-name caring-iggy-disposable \
  --stack-purpose disposable \
  --image-owner YOUR_DOCKERHUB_OWNER \
  --image-tag sha-0123456789ab \
  --admin-email admin@example.org \
  --region eu-west-2

./infrastructure/aws/disposable-verification.sh \
  --stack-name caring-iggy-disposable \
  --budget-ceiling-usd 100 \
  --region eu-west-2
```

The script checks:

- the stack is tagged `Purpose=disposable` and is `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- the estimated monthly cost is below the budget ceiling
- ports 80/443 are reachable, and SSH, frontend, Kong proxy/admin, all five Spring ports, and PostgreSQL are closed
- HTTP redirects to HTTPS and the TLS certificate is trusted and valid for more than one day
- all eight expected containers exist, are running and healthy, and report no OOM kill
- database role isolation passes
- reboot dispatch is accepted, SSM goes offline, and a changed kernel boot ID plus healthy containers proves recovery
- a bad image tag can be rolled back
- point-in-time restore to a new temporary RDS instance succeeds

The verifier leaves the protected temporary RDS instance and the stack in place; it prints the restore identifier before creation and a cleanup checklist at the end. Every complete invocation creates another retained restore, so review and remove each separately. A failed command also leaves any created AWS resources for manual review. It never disables source protection or deletes resources.

Record the first run's TLS serial, issuer, and expiry. Keep the disposable stack running for at least 8 days, then rerun with the baseline serial:

```bash
./infrastructure/aws/disposable-verification.sh \
  --stack-name caring-iggy-disposable \
  --budget-ceiling-usd 100 \
  --region eu-west-2 \
  --previous-certificate-serial BASELINE_HEX_SERIAL
```

This fails if the certificate serial is unchanged; trusted HTTPS and future expiry are checked again. The operator must record elapsed time and confirm the Let's Encrypt issuer.

Run the capacity command from section 13 and retain its k6 summary. Acceptance requires the continuous 2-minute ramp to 300 VUs, 10-minute hold, 1-minute ramp to 700, 2-minute hold, and 1-minute ramp to zero; 5xx/check failure rates below 1%; p95 below 2 seconds and p99 below 5 seconds. Capture Docker OOM events and container health throughout the run through SSM, and check health again afterward. Verify that the load generator itself is not CPU/network saturated. Local command-boundary tests prove harness behavior only; real PostgreSQL fixture cleanup and these capacity limits remain unmeasured.

Acceptance record to fill after live execution:

| Check | Current result |
| --- | --- |
| Disposable deployment and private/public network checks | Pending |
| Trusted IP HTTPS and 8-day certificate renewal | Pending |
| Role isolation and real fixture cleanup | Pending |
| Fresh reboot and bad-image rollback | Pending |
| PITR connectivity plus restored schemas/data | Pending |
| 300/700 VUs, latency/error limits, no OOM/health failure | Pending |

## 15. Decommission

There is no automated destroy command. To decommission a stack:

1. Confirm your RDS snapshot plan. CloudFormation will create a final snapshot because the instance has `DeletionPolicy: Snapshot`.
2. Update the stack to disable deletion protection:

   ```bash
   aws cloudformation create-change-set \
     --region eu-west-2 \
     --stack-name caring-iggy-production \
     --change-set-name disable-deletion-protection \
     --change-set-type UPDATE \
     --use-previous-template \
     --parameters \
       ParameterKey=EnableRdsDeletionProtection,ParameterValue=false \
       ParameterKey=LatestAmiId,UsePreviousValue=true \
     --capabilities CAPABILITY_IAM

   aws cloudformation wait change-set-create-complete \
     --region eu-west-2 \
     --stack-name caring-iggy-production \
     --change-set-name disable-deletion-protection

   aws cloudformation describe-change-set \
     --region eu-west-2 \
     --stack-name caring-iggy-production \
     --change-set-name disable-deletion-protection
   ```

3. Review the change set **before execution**. It must only disable protection on the intended Database resource, with no replacement or unrelated infrastructure change. After review:

   ```bash
   aws cloudformation execute-change-set \
     --region eu-west-2 \
     --stack-name caring-iggy-production \
     --change-set-name disable-deletion-protection

   aws cloudformation wait stack-update-complete \
     --region eu-west-2 \
     --stack-name caring-iggy-production
   ```
4. Empty **only** the stack-owned artifact bucket after explicit confirmation. The bucket name is in the stack outputs (`ArtifactBucketName`).
5. Delete the CloudFormation stack separately. This creates the final RDS snapshot.

Do not empty the bucket or delete the stack until you have confirmed the snapshot plan.
