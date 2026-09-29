#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
script="$repo_root/infrastructure/aws/bootstrap-admin.sh"
if [[ ! -x "$script" ]]; then
    echo "bootstrap-admin.sh is missing" >&2
    exit 1
fi

fixture_dir=$(mktemp -d)
network_name="ci-admin-db-$RANDOM-$$"
container_name="ci-admin-postgres-$RANDOM-$$"
cleanup() {
    docker rm -f "$container_name" >/dev/null 2>&1 || true
    docker network rm "$network_name" >/dev/null 2>&1 || true
    rm -rf "$fixture_dir"
}
trap cleanup EXIT

master_password='master-fixture''-password'
users_password=$(printf '22%.0s' {1..32})
admin_password=$(printf '44%.0s' {1..32})
admin_email=admin@example.org

write_app_secret() {
    local email=$1
    jq -n \
        --arg users_password "$users_password" \
        --arg admin_password "$admin_password" \
        --arg email "$email" \
        '{
          jwt: {privateKeyBase64: "unused", publicKeyBase64: "unused", keyId: "ci-key-1"},
          frontend: {sessionSecretHex: ("a" * 64), csrfSecretHex: ("b" * 64)},
          databases: {
            animals: {username: "animals_app", passwordHex: ("1" * 64)},
            users: {username: "users_app", passwordHex: $users_password},
            adopters: {username: "adopters_app", passwordHex: ("3" * 64)}
          },
          initialAdmin: {email: $email, passwordHex: $admin_password}
        }' >"$fixture_dir/app-secret.json"
}
write_app_secret "$admin_email"

mkdir -p "$fixture_dir/bin"
cat >"$fixture_dir/bin/aws" <<'EOF'
#!/usr/bin/env bash
cat "$APP_SECRET_FIXTURE"
EOF
chmod +x "$fixture_dir/bin/aws"

docker network create "$network_name" >/dev/null
docker run -d --name "$container_name" --network "$network_name" \
    -e POSTGRES_PASSWORD="$master_password" postgres:15-alpine >/dev/null
for _ in {1..30}; do
    if docker exec "$container_name" pg_isready -U postgres >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
docker exec "$container_name" pg_isready -U postgres >/dev/null

docker exec "$container_name" psql -U postgres -v ON_ERROR_STOP=1 \
    -c "CREATE ROLE users_app LOGIN PASSWORD '$users_password'" >/dev/null
docker exec "$container_name" psql -U postgres -v ON_ERROR_STOP=1 \
    -c 'CREATE DATABASE users_db OWNER users_app' >/dev/null
docker exec "$container_name" psql -U postgres -d users_db -v ON_ERROR_STOP=1 \
    -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto' >/dev/null

for migration in "$repo_root"/backend/user-service/src/main/resources/db/migration/*.sql; do
    docker exec -i -e "PGPASSWORD=$users_password" "$container_name" \
        psql -h 127.0.0.1 -U users_app -d users_db -v ON_ERROR_STOP=1 \
        <"$migration" >/dev/null
done

log_file="$fixture_dir/output.log"
run_bootstrap() {
    PATH="$fixture_dir/bin:$PATH" \
    ALLOW_NON_ROOT_TEST=1 \
    AWS_REGION=eu-west-2 \
    APP_SECRET_ARN=app-secret \
    RDS_ENDPOINT="$container_name" \
    APP_SECRET_FIXTURE="$fixture_dir/app-secret.json" \
    DB_NETWORK="$network_name" \
    DB_SSLMODE=disable \
    POSTGRES_CLIENT_IMAGE=postgres:15-alpine \
        bash "$script" >>"$log_file" 2>&1
}

run_bootstrap
first_hash=$(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT password_hash FROM accounts WHERE lower(email) = lower('$admin_email')")

[[ $(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT count(*) FROM employees WHERE lower(email) = lower('$admin_email') AND name = 'Initial Administrator' AND role = 'ADMIN'") == 1 ]]
[[ $(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT count(*) FROM accounts WHERE lower(email) = lower('$admin_email') AND role = 'ADMIN' AND profile_type = 'EMPLOYEE'") == 1 ]]
[[ $(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT count(*) FROM accounts WHERE lower(email) = lower('$admin_email') AND password_hash = crypt('$admin_password', password_hash)") == 1 ]]
[[ "$first_hash" =~ ^\$2[aby]\$12\$ ]]

run_bootstrap
second_hash=$(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT password_hash FROM accounts WHERE lower(email) = lower('$admin_email')")
[[ "$first_hash" == "$second_hash" ]]
[[ $(docker exec "$container_name" psql -U postgres -d users_db -Atqc \
    "SELECT count(*) FROM accounts WHERE role = 'ADMIN'") == 1 ]]

different_email=other-admin@example.org
write_app_secret "$different_email"
if run_bootstrap; then
    echo "bootstrap accepted a second administrator" >&2
    exit 1
fi

for secret in "$admin_email" "$different_email" "$admin_password" "$first_hash"; do
    if grep -Fq "$secret" "$log_file"; then
        echo "administrator secret leaked into command output" >&2
        exit 1
    fi
done

echo "administrator bootstrap contract: PASS"
