#!/usr/bin/env bash
set -euo pipefail

umask 077

if ((EUID != 0)) && [[ ${ALLOW_NON_ROOT_TEST:-0} != 1 ]]; then
    echo "init-databases must run as root" >&2
    exit 1
fi

: "${AWS_REGION:?AWS_REGION is required}"
: "${APP_SECRET_ARN:?APP_SECRET_ARN is required}"
: "${RDS_SECRET_ARN:?RDS_SECRET_ARN is required}"
: "${RDS_ENDPOINT:?RDS_ENDPOINT is required}"

for command in aws docker jq; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "required command is unavailable: $command" >&2
        exit 1
    fi
done

postgres_client_image=${POSTGRES_CLIENT_IMAGE:-postgres:15-alpine@sha256:25d430274d8a31184f9435cc5b2f56aff254952065bbbcac0c51acedb5a1d1e7}
db_sslmode=${DB_SSLMODE:-require}

if [[ -n ${DB_NETWORK:-} ]]; then
    db_network=$DB_NETWORK
else
    deployment_env_file=${DEPLOYMENT_ENV_FILE:-${CONFIG_DIR:-/etc/caring-iggy}/deployment.env}
    compose_file=${COMPOSE_FILE:-${INSTALL_DIR:-/opt/caring-iggy}/docker-compose.prod.yml}
    compose_config=$(docker compose --env-file "$deployment_env_file" -f "$compose_file" \
        config --no-env-resolution --format json)
    compose_project=$(jq -er '.name | select(type == "string" and length > 0)' <<<"$compose_config")
    db_network=$(jq -er '.networks.backend.name | select(type == "string" and length > 0)' <<<"$compose_config")
    if network_config=$(docker network inspect "$db_network" 2>/dev/null); then
        jq -e --arg project "$compose_project" '
            .[0].Labels["com.docker.compose.project"] == $project and
            .[0].Labels["com.docker.compose.network"] == "backend"
        ' <<<"$network_config" >/dev/null || {
            echo "backend network has incorrect Compose labels" >&2
            exit 1
        }
    else
        docker network create \
            --label "com.docker.compose.project=$compose_project" \
            --label 'com.docker.compose.network=backend' \
            "$db_network" >/dev/null
    fi
fi

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
chmod 700 "$temp_dir"
app_secret_file="$temp_dir/app-secret.json"
rds_secret_file="$temp_dir/rds-secret.json"
sql_file="$temp_dir/initialize.sql"

aws secretsmanager get-secret-value \
    --region "$AWS_REGION" \
    --secret-id "$APP_SECRET_ARN" \
    --query SecretString \
    --output text >"$app_secret_file"
aws secretsmanager get-secret-value \
    --region "$AWS_REGION" \
    --secret-id "$RDS_SECRET_ARN" \
    --query SecretString \
    --output text >"$rds_secret_file"
chmod 600 "$app_secret_file" "$rds_secret_file"

jq -e '
    [.databases.animals, .databases.users, .databases.adopters] |
    all(
      (.username | type == "string" and test("^[a-z][a-z0-9_]{2,31}$")) and
      (.passwordHex | type == "string" and test("^[0-9a-f]{64}$"))
    )
' "$app_secret_file" >/dev/null || {
    echo "application database secret structure is invalid" >&2
    exit 1
}
jq -e '
    (.username | type == "string" and length > 0) and
    (.password | type == "string" and length > 0)
' "$rds_secret_file" >/dev/null || {
    echo "RDS secret structure is invalid" >&2
    exit 1
}

export PGUSER
export PGPASSWORD
export ANIMALS_USERNAME
export ANIMALS_PASSWORD
export USERS_USERNAME
export USERS_PASSWORD
export ADOPTERS_USERNAME
export ADOPTERS_PASSWORD
export RDS_ENDPOINT
export DB_SSLMODE="$db_sslmode"

PGUSER=$(jq -r '.username' "$rds_secret_file")
PGPASSWORD=$(jq -r '.password' "$rds_secret_file")
ANIMALS_USERNAME=$(jq -r '.databases.animals.username' "$app_secret_file")
ANIMALS_PASSWORD=$(jq -r '.databases.animals.passwordHex' "$app_secret_file")
USERS_USERNAME=$(jq -r '.databases.users.username' "$app_secret_file")
USERS_PASSWORD=$(jq -r '.databases.users.passwordHex' "$app_secret_file")
ADOPTERS_USERNAME=$(jq -r '.databases.adopters.username' "$app_secret_file")
ADOPTERS_PASSWORD=$(jq -r '.databases.adopters.passwordHex' "$app_secret_file")

cat >"$sql_file" <<'SQL'
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE %I LOGIN', :'animals_role')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'animals_role') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'users_role')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'users_role') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'adopters_role')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'adopters_role') \gexec

SELECT format(
    'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
    :'animals_role', :'animals_password'
) \gexec
SELECT format(
    'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
    :'users_role', :'users_password'
) \gexec
SELECT format(
    'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
    :'adopters_role', :'adopters_password'
) \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'animals_db', :'animals_role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'animals_db') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'users_db', :'users_role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'users_db') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'adopters_db', :'adopters_role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'adopters_db') \gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'animals_db', :'animals_role') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'users_db', :'users_role') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'adopters_db', :'adopters_role') \gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'animals_db') \gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'users_db') \gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'adopters_db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'animals_db', :'animals_role') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'users_db', :'users_role') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'adopters_db', :'adopters_role') \gexec

\connect :animals_db
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SELECT format('ALTER SCHEMA public OWNER TO %I', :'animals_role') \gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'animals_role') \gexec

\connect :users_db
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SELECT format('ALTER SCHEMA public OWNER TO %I', :'users_role') \gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'users_role') \gexec
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\connect :adopters_db
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SELECT format('ALTER SCHEMA public OWNER TO %I', :'adopters_role') \gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'adopters_role') \gexec
SQL
chmod 600 "$sql_file"

docker run --rm --network "$db_network" \
    -e PGUSER -e PGPASSWORD -e RDS_ENDPOINT -e DB_SSLMODE \
    -e ANIMALS_USERNAME -e ANIMALS_PASSWORD \
    -e USERS_USERNAME -e USERS_PASSWORD \
    -e ADOPTERS_USERNAME -e ADOPTERS_PASSWORD \
    -v "$sql_file:/work/initialize.sql:ro" \
    "$postgres_client_image" sh -euc '
        export PGSSLMODE="$DB_SSLMODE"
        psql -h "$RDS_ENDPOINT" -d postgres \
            -v animals_role="$ANIMALS_USERNAME" \
            -v animals_password="$ANIMALS_PASSWORD" \
            -v users_role="$USERS_USERNAME" \
            -v users_password="$USERS_PASSWORD" \
            -v adopters_role="$ADOPTERS_USERNAME" \
            -v adopters_password="$ADOPTERS_PASSWORD" \
            -v animals_db=animals_db \
            -v users_db=users_db \
            -v adopters_db=adopters_db \
            -f /work/initialize.sql >/dev/null

        verify_role() {
            role=$1
            password=$2
            own_database=$3
            shift 3
            PGPASSWORD="$password" psql -h "$RDS_ENDPOINT" -U "$role" \
                -d "$own_database" -Atqc "SELECT 1" | grep -qx 1
            for forbidden_database in "$@"; do
                if PGPASSWORD="$password" psql -h "$RDS_ENDPOINT" -U "$role" \
                    -d "$forbidden_database" -Atqc "SELECT 1" >/dev/null 2>&1; then
                    echo "database role isolation verification failed" >&2
                    exit 1
                fi
            done
        }

        verify_role "$ANIMALS_USERNAME" "$ANIMALS_PASSWORD" animals_db users_db adopters_db
        verify_role "$USERS_USERNAME" "$USERS_PASSWORD" users_db animals_db adopters_db
        verify_role "$ADOPTERS_USERNAME" "$ADOPTERS_PASSWORD" adopters_db animals_db users_db
    '

unset PGPASSWORD ANIMALS_PASSWORD USERS_PASSWORD ADOPTERS_PASSWORD
echo "database initialization complete"
