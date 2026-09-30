#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
script="$repo_root/infrastructure/aws/init-databases.sh"
if [[ ! -x "$script" ]]; then
    echo "init-databases.sh is missing" >&2
    exit 1
fi

fixture_dir=$(mktemp -d)
network_name="ci-init-db-$RANDOM-$$"
container_name="ci-init-postgres-$RANDOM-$$"
cleanup() {
    docker rm -f "$container_name" >/dev/null 2>&1 || true
    docker network rm "$network_name" >/dev/null 2>&1 || true
    rm -rf "$fixture_dir"
}
trap cleanup EXIT

master_password='master-fixture''-password'
animals_password=$(printf '11%.0s' {1..32})
users_password=$(printf '22%.0s' {1..32})
adopters_password=$(printf '33%.0s' {1..32})

jq -n \
    --arg animals_password "$animals_password" \
    --arg users_password "$users_password" \
    --arg adopters_password "$adopters_password" \
    '{
      jwt: {privateKeyBase64: "unused", publicKeyBase64: "unused", keyId: "ci-key-1"},
      frontend: {sessionSecretHex: ("a" * 64), csrfSecretHex: ("b" * 64)},
      databases: {
        animals: {username: "animals_app", passwordHex: $animals_password},
        users: {username: "users_app", passwordHex: $users_password},
        adopters: {username: "adopters_app", passwordHex: $adopters_password}
      },
      initialAdmin: {email: "admin@example.org", passwordHex: ("4" * 64)}
    }' >"$fixture_dir/app-secret.json"
jq -n --arg password "$master_password" \
    '{username: "postgres", password: $password}' >"$fixture_dir/rds-secret.json"

mkdir -p "$fixture_dir/bin"
cat >"$fixture_dir/bin/aws" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
secret_id=""
while (($#)); do
    if [[ "$1" == "--secret-id" ]]; then
        secret_id="$2"
        shift 2
    else
        shift
    fi
done
case "$secret_id" in
    "$APP_SECRET_ARN") cat "$APP_SECRET_FIXTURE" ;;
    "$RDS_SECRET_ARN") cat "$RDS_SECRET_FIXTURE" ;;
    *) exit 2 ;;
esac
EOF
chmod +x "$fixture_dir/bin/aws"

docker network create "$network_name" >/dev/null
docker run -d --name "$container_name" --network "$network_name" \
    -e POSTGRES_PASSWORD="$master_password" postgres:15-alpine >/dev/null

database_ready=0
for _ in {1..30}; do
    if docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
        database_ready=1
        break
    fi
    sleep 1
done
if ((database_ready == 0)); then
    echo "database TCP readiness timed out for $container_name; last 50 container log lines follow" >&2
    docker logs --tail 50 "$container_name" >&2 || true
    exit 1
fi
docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null

log_file="$fixture_dir/output.log"
for _ in 1 2; do
    if ! PATH="$fixture_dir/bin:$PATH" \
        ALLOW_NON_ROOT_TEST=1 \
        AWS_REGION=eu-west-2 \
        APP_SECRET_ARN=app-secret \
        RDS_SECRET_ARN=rds-secret \
        RDS_ENDPOINT="$container_name" \
        APP_SECRET_FIXTURE="$fixture_dir/app-secret.json" \
        RDS_SECRET_FIXTURE="$fixture_dir/rds-secret.json" \
        DB_NETWORK="$network_name" \
        DB_SSLMODE=disable \
        POSTGRES_CLIENT_IMAGE=postgres:15-alpine \
            bash "$script" >>"$log_file" 2>&1; then
        cat "$log_file" >&2
        exit 1
    fi
done

assert_role_access() {
    local role=$1
    local password=$2
    local own_database=$3
    shift 3

    docker exec -e "PGPASSWORD=$password" "$container_name" \
        psql -h 127.0.0.1 -U "$role" -d "$own_database" -Atqc 'SELECT 1' \
        | grep -qx '1'

    local denied_database
    for denied_database in "$@"; do
        if docker exec -e "PGPASSWORD=$password" "$container_name" \
            psql -h 127.0.0.1 -U "$role" -d "$denied_database" -Atqc 'SELECT 1' \
            >/dev/null 2>&1; then
            echo "$role connected to forbidden database $denied_database" >&2
            exit 1
        fi
    done
}

assert_role_access animals_app "$animals_password" animals_db users_db adopters_db
assert_role_access users_app "$users_password" users_db animals_db adopters_db
assert_role_access adopters_app "$adopters_password" adopters_db animals_db users_db

[[ $(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT count(*) FROM pg_extension WHERE extname = 'pgcrypto'") == 1 ]]
[[ $(docker exec "$container_name" psql -U postgres -d animals_db -Atqc \
    "SELECT count(*) FROM pg_extension WHERE extname = 'pgcrypto'") == 0 ]]
[[ $(docker exec "$container_name" psql -U postgres -d adopters_db -Atqc \
    "SELECT count(*) FROM pg_extension WHERE extname = 'pgcrypto'") == 0 ]]

for secret in "$master_password" "$animals_password" "$users_password" "$adopters_password"; do
    if grep -Fq "$secret" "$log_file"; then
        echo "database secret leaked into command output" >&2
        exit 1
    fi
done

echo "database initialization contract: PASS"
