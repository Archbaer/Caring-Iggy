#!/usr/bin/env bash
set -euo pipefail

umask 077

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
runtime_dir=${RUNTIME_DIR:-/run/caring-iggy}
kong_template=${KONG_TEMPLATE:-$script_dir/kong.prod.yml.template}

if ((EUID != 0)) && [[ ${ALLOW_NON_ROOT_TEST:-0} != 1 ]]; then
    echo "prepare-runtime must run as root" >&2
    exit 1
fi

: "${AWS_REGION:?AWS_REGION is required}"
: "${APP_SECRET_ARN:?APP_SECRET_ARN is required}"
: "${RDS_SECRET_ARN:?RDS_SECRET_ARN is required}"
: "${RDS_ENDPOINT:?RDS_ENDPOINT is required}"

for command in aws jq openssl install; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "required command is unavailable: $command" >&2
        exit 1
    fi
done

if [[ ! -f "$kong_template" ]]; then
    echo "Kong configuration template is unavailable" >&2
    exit 1
fi

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
chmod 700 "$temp_dir"

app_secret_file="$temp_dir/app-secret.json"
rds_secret_file="$temp_dir/rds-secret.json"
private_key_file="$temp_dir/private-key.pem"
public_key_file="$temp_dir/public-key.pem"

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
    (.jwt.privateKeyBase64 | type == "string" and test("^[A-Za-z0-9+/]+={0,2}$")) and
    (.jwt.publicKeyBase64 | type == "string" and test("^[A-Za-z0-9+/]+={0,2}$")) and
    (.jwt.keyId == "ci-key-1") and
    (.frontend.sessionSecretHex | type == "string" and test("^[0-9a-f]{64}$")) and
    (.frontend.csrfSecretHex | type == "string" and test("^[0-9a-f]{64}$")) and
    (.databases.animals.username | type == "string" and test("^[a-z][a-z0-9_]{2,31}$")) and
    (.databases.animals.passwordHex | type == "string" and test("^[0-9a-f]{64}$")) and
    (.databases.users.username | type == "string" and test("^[a-z][a-z0-9_]{2,31}$")) and
    (.databases.users.passwordHex | type == "string" and test("^[0-9a-f]{64}$")) and
    (.databases.adopters.username | type == "string" and test("^[a-z][a-z0-9_]{2,31}$")) and
    (.databases.adopters.passwordHex | type == "string" and test("^[0-9a-f]{64}$")) and
    (.initialAdmin.email | type == "string" and test("^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$")) and
    (.initialAdmin.passwordHex | type == "string" and test("^[0-9a-f]{64}$"))
' "$app_secret_file" >/dev/null || {
    echo "application secret has an invalid structure" >&2
    exit 1
}

jq -e '
    (.username | type == "string" and length > 0) and
    (.password | type == "string" and length > 0)
' "$rds_secret_file" >/dev/null || {
    echo "RDS secret has an invalid structure" >&2
    exit 1
}

jq -r '.jwt.privateKeyBase64' "$app_secret_file" | openssl base64 -d -A >"$private_key_file"
jq -r '.jwt.publicKeyBase64' "$app_secret_file" | openssl base64 -d -A >"$public_key_file"
chmod 600 "$private_key_file" "$public_key_file"

openssl pkey -in "$private_key_file" -noout >/dev/null 2>&1 || {
    echo "application secret contains an invalid private key" >&2
    exit 1
}
openssl pkey -pubin -in "$public_key_file" -noout >/dev/null 2>&1 || {
    echo "application secret contains an invalid public key" >&2
    exit 1
}

install -d -m 700 "$runtime_dir"

write_env_file() {
    local target=$1
    local source_file
    source_file="$temp_dir/$(basename "$target").tmp"
    shift
    printf '%s\n' "$@" >"$source_file"
    chmod 600 "$source_file"
    install -m 600 "$source_file" "$target"
}

animals_username=$(jq -r '.databases.animals.username' "$app_secret_file")
animals_password=$(jq -r '.databases.animals.passwordHex' "$app_secret_file")
adopters_username=$(jq -r '.databases.adopters.username' "$app_secret_file")
adopters_password=$(jq -r '.databases.adopters.passwordHex' "$app_secret_file")
users_username=$(jq -r '.databases.users.username' "$app_secret_file")
users_password=$(jq -r '.databases.users.passwordHex' "$app_secret_file")
private_key_base64=$(jq -r '.jwt.privateKeyBase64' "$app_secret_file")
public_key_base64=$(jq -r '.jwt.publicKeyBase64' "$app_secret_file")
jwt_key_id=$(jq -r '.jwt.keyId' "$app_secret_file")
session_secret=$(jq -r '.frontend.sessionSecretHex' "$app_secret_file")
csrf_secret=$(jq -r '.frontend.csrfSecretHex' "$app_secret_file")

write_env_file "$runtime_dir/animal-service.env" \
    "DB_USERNAME=$animals_username" \
    "DB_PASSWORD=$animals_password"
write_env_file "$runtime_dir/adopter-service.env" \
    "DB_USERNAME=$adopters_username" \
    "DB_PASSWORD=$adopters_password"
write_env_file "$runtime_dir/user-service.env" \
    "DB_USERNAME=$users_username" \
    "DB_PASSWORD=$users_password" \
    "JWT_PRIVATE_KEY_BASE64=$private_key_base64" \
    "JWT_PUBLIC_KEY_BASE64=$public_key_base64" \
    "JWT_KEY_ID=$jwt_key_id"
write_env_file "$runtime_dir/frontend.env" \
    "AUTH_SESSION_STATE_SECRET=$session_secret" \
    "AUTH_CSRF_SECRET=$csrf_secret"

rendered_kong="$temp_dir/kong.yml"
awk -v public_key_file="$public_key_file" '
    /__JWT_PUBLIC_KEY_PEM__/ {
        match($0, /^[[:space:]]*/)
        indent = substr($0, RSTART, RLENGTH)
        while ((getline line < public_key_file) > 0) {
            print indent line
        }
        close(public_key_file)
        next
    }
    { print }
' "$kong_template" >"$rendered_kong"
chmod 600 "$rendered_kong"
install -m 600 "$rendered_kong" "$runtime_dir/kong.yml"

if ((EUID == 0)); then
    chown "${KONG_CONFIG_UID:-1001}:${KONG_CONFIG_GID:-1001}" "$runtime_dir/kong.yml"
fi

stat_mode() {
    stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"
}

[[ $(stat_mode "$runtime_dir") == 700 ]] || {
    echo "runtime directory permissions are invalid" >&2
    exit 1
}
for file in animal-service.env adopter-service.env user-service.env frontend.env kong.yml; do
    [[ $(stat_mode "$runtime_dir/$file") == 600 ]] || {
        echo "runtime file permissions are invalid: $file" >&2
        exit 1
    }
done

echo "runtime configuration prepared"
