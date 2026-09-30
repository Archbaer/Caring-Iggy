#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
script="$repo_root/infrastructure/aws/prepare-runtime.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT

bin_dir="$fixture_dir/bin"
runtime_dir="$fixture_dir/runtime"
mkdir -p "$bin_dir"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
    -out "$fixture_dir/private.pem" 2>/dev/null
openssl pkey -in "$fixture_dir/private.pem" -pubout \
    -out "$fixture_dir/public.pem" 2>/dev/null
printf '#>>>???\n' >>"$fixture_dir/private.pem"
printf '#>>>???\n' >>"$fixture_dir/public.pem"
for key_file in "$fixture_dir/private.pem" "$fixture_dir/public.pem"; do
    if (( $(wc -c <"$key_file") % 3 == 0 )); then
        printf 'x' >>"$key_file"
    fi
done
private_key_base64=$(base64 <"$fixture_dir/private.pem" | tr -d '\n')
public_key_base64=$(base64 <"$fixture_dir/public.pem" | tr -d '\n')

if ! grep -Fq '+' <<<"$private_key_base64$public_key_base64" || \
    ! grep -Fq '/' <<<"$private_key_base64$public_key_base64" || \
    ! grep -Fq '=' <<<"$private_key_base64$public_key_base64"; then
    echo "key fixture must exercise base64 +, /, or = characters" >&2
    exit 1
fi

session_secret=$(printf 'ab%.0s' {1..32})
csrf_secret=$(printf 'cd%.0s' {1..32})
animal_password=$(printf '11%.0s' {1..32})
user_password=$(printf '22%.0s' {1..32})
adopter_password=$(printf '33%.0s' {1..32})
admin_password=$(printf '44%.0s' {1..32})

jq -n \
    --arg private "$private_key_base64" \
    --arg public "$public_key_base64" \
    --arg session "$session_secret" \
    --arg csrf "$csrf_secret" \
    --arg animal_password "$animal_password" \
    --arg user_password "$user_password" \
    --arg adopter_password "$adopter_password" \
    --arg admin_password "$admin_password" \
    '{
      jwt: {privateKeyBase64: $private, publicKeyBase64: $public, keyId: "ci-key-1"},
      frontend: {sessionSecretHex: $session, csrfSecretHex: $csrf},
      databases: {
        animals: {username: "animals_app", passwordHex: $animal_password},
        users: {username: "users_app", passwordHex: $user_password},
        adopters: {username: "adopters_app", passwordHex: $adopter_password}
      },
      initialAdmin: {email: "admin@example.org", passwordHex: $admin_password}
    }' >"$fixture_dir/app-secret.json"

fixture_password='master-fixture''-password'
jq -n --arg password "$fixture_password" '{username: "postgres", password: $password}' \
    >"$fixture_dir/rds-secret.json"

cat >"$bin_dir/aws" <<'EOF'
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

cat >"$bin_dir/install" <<'EOF'
#!/usr/bin/env bash
exec /usr/bin/install "$@"
EOF

cat >"$bin_dir/docker" <<'EOF'
#!/usr/bin/env bash
echo "prepare-runtime must not invoke Docker" >&2
exit 99
EOF
cat >"$bin_dir/stat" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "-f" ]]; then
    echo "overlayfs"
    exit 0
fi
if [[ "$1" == "-c" ]]; then
    shift 2
    if "$REAL_STAT" -c '%a' "$1" >/dev/null 2>&1; then
        exec "$REAL_STAT" -c '%a' "$1"
    fi
    exec "$REAL_STAT" -f '%Lp' "$1"
fi
exit 2
EOF
chmod +x "$bin_dir/aws" "$bin_dir/install" "$bin_dir/docker" "$bin_dir/stat"

log_file="$fixture_dir/output.log"
real_stat=$(command -v stat)
if ! PATH="$bin_dir:$PATH" \
    REAL_STAT="$real_stat" \
    ALLOW_NON_ROOT_TEST=1 \
    AWS_REGION=eu-west-2 \
    APP_SECRET_ARN=app-secret \
    RDS_SECRET_ARN=rds-secret \
    RDS_ENDPOINT=db.example.internal \
    APP_SECRET_FIXTURE="$fixture_dir/app-secret.json" \
    RDS_SECRET_FIXTURE="$fixture_dir/rds-secret.json" \
    RUNTIME_DIR="$runtime_dir" \
    KONG_TEMPLATE="$repo_root/infrastructure/aws/kong.prod.yml.template" \
    bash "$script" >"$log_file" 2>&1; then
    cat "$log_file"
    exit 1
fi

stat_mode() {
    stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"
}

[[ "$(stat_mode "$runtime_dir")" == "700" ]]
for file in animal-service.env adopter-service.env user-service.env frontend.env kong.yml; do
    [[ "$(stat_mode "$runtime_dir/$file")" == "600" ]]
done

grep -Fqx "DB_USERNAME=animals_app" "$runtime_dir/animal-service.env"
grep -Fqx "DB_PASSWORD=$animal_password" "$runtime_dir/animal-service.env"
grep -Fqx "DB_USERNAME=adopters_app" "$runtime_dir/adopter-service.env"
grep -Fqx "DB_PASSWORD=$adopter_password" "$runtime_dir/adopter-service.env"
grep -Fqx "DB_USERNAME=users_app" "$runtime_dir/user-service.env"
grep -Fqx "DB_PASSWORD=$user_password" "$runtime_dir/user-service.env"
grep -Fqx "JWT_PRIVATE_KEY_BASE64=$private_key_base64" "$runtime_dir/user-service.env"
grep -Fqx "JWT_PUBLIC_KEY_BASE64=$public_key_base64" "$runtime_dir/user-service.env"
grep -Fqx "JWT_KEY_ID=ci-key-1" "$runtime_dir/user-service.env"
grep -Fqx "AUTH_SESSION_STATE_SECRET=$session_secret" "$runtime_dir/frontend.env"
grep -Fqx "AUTH_CSRF_SECRET=$csrf_secret" "$runtime_dir/frontend.env"

grep -Fq -- '-----BEGIN PUBLIC KEY-----' "$runtime_dir/kong.yml"
private_key_header='-----BEGIN PRIVATE KEY'
if grep -Fq -- "$private_key_header-----" "$runtime_dir/kong.yml"; then
    echo "private key leaked into Kong configuration" >&2
    exit 1
fi
if grep -Fq '__JWT_PUBLIC_KEY_PEM__' "$runtime_dir/kong.yml"; then
    echo "Kong public-key placeholder was not rendered" >&2
    exit 1
fi

for secret in \
    "$private_key_base64" "$public_key_base64" "$session_secret" "$csrf_secret" \
    "$animal_password" "$user_password" "$adopter_password" "$admin_password" \
    master-fixture''-password; do
    if grep -Fq "$secret" "$log_file"; then
        echo "secret leaked into command output" >&2
        exit 1
    fi
done

echo "prepare-runtime contract: PASS"
