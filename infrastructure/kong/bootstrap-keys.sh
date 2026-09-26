#!/bin/bash

# Bootstrap local environment secrets
# Generates JWT keys and frontend auth secrets in .env, then updates kong.yml
# Run once at deploy/bootstrap; restart-safe: all instances read from shared .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$INFRA_DIR/.env"
KONG_FILE="$INFRA_DIR/kong/kong.yml"

KID="ci-key-1"

# Create temp directory for key generation (outside repo, auto-cleanup on EXIT)
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

TEMP_PRIVATE="$TEMP_DIR/tmp-private.pem"
TEMP_PUBLIC="$TEMP_DIR/tmp-public.pem"

# Step 1: Generate RSA-2048 keypair (PKCS#8 private, SPKI public)
echo "Generating RSA-2048 keypair..."
openssl genrsa -out "$TEMP_PRIVATE" 2048 2>/dev/null
openssl pkcs8 -topk8 -inform PEM -outform PEM -in "$TEMP_PRIVATE" \
    -out "$TEMP_DIR/tmp-private-pkcs8.pem" -nocrypt
mv "$TEMP_DIR/tmp-private-pkcs8.pem" "$TEMP_PRIVATE"

openssl rsa -in "$TEMP_PRIVATE" -pubout -out "$TEMP_PUBLIC" 2>/dev/null

# Step 2: Base64 encode keypair
PRIV_B64=$(base64 -i "$TEMP_PRIVATE" | tr -d '\n')
PUB_B64=$(base64 -i "$TEMP_PUBLIC" | tr -d '\n')
AUTH_SESSION_STATE_SECRET=$(openssl rand -hex 32)
AUTH_CSRF_SECRET=$(openssl rand -hex 32)

# Step 3: Write to .env (upsert existing entries or append)
echo "Writing keys to $ENV_FILE..."

# Initialize .env if it doesn't exist
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

upsert_env() {
    local key="$1"
    local value="$2"
    local temp_env
    temp_env=$(mktemp "$INFRA_DIR/.env.tmp.XXXXXX")

    awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    {
        name = $0
        sub(/=.*/, "", name)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)

        if (name == key) {
            if (!found) {
                print key "=" value
                found = 1
            }
            next
        }

        print
    }
    END {
        if (!found) {
            print key "=" value
        }
    }
    ' "$ENV_FILE" > "$temp_env"

    mv "$temp_env" "$ENV_FILE"
}

upsert_env JWT_PRIVATE_KEY "$PRIV_B64"
upsert_env JWT_PUBLIC_KEY "$PUB_B64"
upsert_env JWT_KEY_ID "$KID"
upsert_env AUTH_SESSION_STATE_SECRET "$AUTH_SESSION_STATE_SECRET"
upsert_env AUTH_CSRF_SECRET "$AUTH_CSRF_SECRET"

# Step 4: kong.yml is tracked in git — it must already exist
if [ ! -f "$KONG_FILE" ]; then
    echo "ERROR: $KONG_FILE not found. kong.yml is tracked in git; pull it or restore it before bootstrapping keys." >&2
    exit 1
fi

# Step 5: Replace the rsa_public_key block scalar between marker comments (idempotent on re-run)
echo "Injecting public key into $KONG_FILE..."

# Replace the rsa_public_key key + PEM block between BEGIN/END markers with the new public key,
# indented to match the surrounding YAML (2 spaces deeper than the marker line).
TEMP_KONG=$(mktemp)
awk '
BEGIN { in_section = 0 }
/^[ \t]*# --- BEGIN JWT PUBLIC KEY/ {
    print
    match($0, /^[ \t]*/)
    indent = substr($0, RSTART, RLENGTH)
    print indent "rsa_public_key: |"
    while ((getline line < "'"$TEMP_PUBLIC"'") > 0) {
        print indent "  " line
    }
    close("'"$TEMP_PUBLIC"'")
    in_section = 1
    next
}
/^[ \t]*# --- END JWT PUBLIC KEY/ {
    in_section = 0
    print
    next
}
in_section {
    next
}
{ print }
' "$KONG_FILE" > "$TEMP_KONG"
# mktemp creates 0600; Kong runs as its own user inside the container and must be able to read the bind mount
chmod 644 "$TEMP_KONG"
mv "$TEMP_KONG" "$KONG_FILE"

echo ""
echo "Bootstrapped kid=$KID and frontend auth secrets. Services read shared values from .env."
echo "Rotation: re-run with a new KID, keep old key in kong.yml + JWKS until old tokens expire."
