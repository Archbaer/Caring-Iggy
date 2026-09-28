#!/usr/bin/env bash
set -euo pipefail

umask 077

if ((EUID != 0)) && [[ ${ALLOW_NON_ROOT_TEST:-0} != 1 ]]; then
    echo "bootstrap-admin must run as root" >&2
    exit 1
fi

: "${AWS_REGION:?AWS_REGION is required}"
: "${APP_SECRET_ARN:?APP_SECRET_ARN is required}"
: "${RDS_ENDPOINT:?RDS_ENDPOINT is required}"

for command in aws docker jq; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "required command is unavailable: $command" >&2
        exit 1
    fi
done

postgres_client_image=${POSTGRES_CLIENT_IMAGE:-postgres:15-alpine@sha256:25d430274d8a31184f9435cc5b2f56aff254952065bbbcac0c51acedb5a1d1e7}
db_network=${DB_NETWORK:-caring-iggy_backend}
db_sslmode=${DB_SSLMODE:-require}

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
chmod 700 "$temp_dir"
app_secret_file="$temp_dir/app-secret.json"
sql_file="$temp_dir/bootstrap-admin.sql"

aws secretsmanager get-secret-value \
    --region "$AWS_REGION" \
    --secret-id "$APP_SECRET_ARN" \
    --query SecretString \
    --output text >"$app_secret_file"
chmod 600 "$app_secret_file"

jq -e '
    (.databases.users.username | type == "string" and test("^[a-z][a-z0-9_]{2,31}$")) and
    (.databases.users.passwordHex | type == "string" and test("^[0-9a-f]{64}$")) and
    (.initialAdmin.email | type == "string" and test("^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$")) and
    (.initialAdmin.passwordHex | type == "string" and test("^[0-9a-f]{64}$"))
' "$app_secret_file" >/dev/null || {
    echo "administrator secret structure is invalid" >&2
    exit 1
}

export DB_USERNAME
export DB_PASSWORD
export ADMIN_EMAIL
export ADMIN_PASSWORD
export RDS_ENDPOINT
export DB_SSLMODE="$db_sslmode"

DB_USERNAME=$(jq -r '.databases.users.username' "$app_secret_file")
DB_PASSWORD=$(jq -r '.databases.users.passwordHex' "$app_secret_file")
ADMIN_EMAIL=$(jq -r '.initialAdmin.email' "$app_secret_file")
ADMIN_PASSWORD=$(jq -r '.initialAdmin.passwordHex' "$app_secret_file")

cat >"$sql_file" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;

SELECT set_config('caring_iggy.admin_email', :'admin_email', true);
SELECT set_config('caring_iggy.admin_password', :'admin_password', true);

DO $bootstrap$
DECLARE
    configured_email text := current_setting('caring_iggy.admin_email');
    configured_password text := current_setting('caring_iggy.admin_password');
    employee_id uuid;
    account_id uuid;
    administrator_role_id integer;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM accounts
        WHERE role = 'ADMIN'
          AND lower(email) <> lower(configured_email)
    ) THEN
        RAISE EXCEPTION 'a different administrator already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM accounts a
        JOIN employees e ON e.id = a.profile_id
        WHERE lower(a.email) = lower(configured_email)
          AND lower(e.email) = lower(configured_email)
          AND a.role = 'ADMIN'
          AND a.profile_type = 'EMPLOYEE'
          AND e.role = 'ADMIN'
    ) THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM accounts WHERE lower(email) = lower(configured_email)) OR
       EXISTS (SELECT 1 FROM employees WHERE lower(email) = lower(configured_email)) THEN
        RAISE EXCEPTION 'administrator identity conflicts with an existing account';
    END IF;

    SELECT id INTO administrator_role_id
    FROM employee_role
    WHERE name = 'ORG_HEAD';
    IF administrator_role_id IS NULL THEN
        RAISE EXCEPTION 'administrator employee role is unavailable';
    END IF;

    employee_id := uuid_generate_v4();
    account_id := uuid_generate_v4();

    INSERT INTO employees (id, name, email, role_id, role, created_at, updated_at)
    VALUES (
        employee_id,
        'Initial Administrator',
        configured_email,
        administrator_role_id,
        'ADMIN',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    INSERT INTO accounts (
        id, email, password_hash, role, profile_id, profile_type, created_at, updated_at
    ) VALUES (
        account_id,
        configured_email,
        crypt(configured_password, gen_salt('bf', 12)),
        'ADMIN',
        employee_id,
        'EMPLOYEE',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
END
$bootstrap$;

COMMIT;
SQL
chmod 600 "$sql_file"

docker run --rm --network "$db_network" \
    -e DB_USERNAME -e DB_PASSWORD -e ADMIN_EMAIL -e ADMIN_PASSWORD \
    -e RDS_ENDPOINT -e DB_SSLMODE \
    -v "$sql_file:/work/bootstrap-admin.sql:ro" \
    "$postgres_client_image" sh -euc '
        export PGSSLMODE="$DB_SSLMODE"
        export PGPASSWORD="$DB_PASSWORD"
        psql -h "$RDS_ENDPOINT" -U "$DB_USERNAME" -d users_db \
            -v admin_email="$ADMIN_EMAIL" \
            -v admin_password="$ADMIN_PASSWORD" \
            -f /work/bootstrap-admin.sql >/dev/null
    '

unset DB_PASSWORD ADMIN_PASSWORD
echo "initial administrator verified"
