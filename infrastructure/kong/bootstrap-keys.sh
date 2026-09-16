#!/bin/bash

# Bootstrap JWT keypair for Kong gateway + user-service
# Generates RSA-2048 keypair, stores in .env, pastes public key to kong.yml
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

# Step 3: Write to .env (upsert existing entries or append)
echo "Writing keys to $ENV_FILE..."

# Initialize .env if it doesn't exist
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

# Update or add JWT_PRIVATE_KEY (portable sed: temp file + mv)
if grep -q "^JWT_PRIVATE_KEY=" "$ENV_FILE"; then
    sed "s|^JWT_PRIVATE_KEY=.*|JWT_PRIVATE_KEY=$PRIV_B64|" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
else
    echo "JWT_PRIVATE_KEY=$PRIV_B64" >> "$ENV_FILE"
fi

# Update or add JWT_PUBLIC_KEY
if grep -q "^JWT_PUBLIC_KEY=" "$ENV_FILE"; then
    sed "s|^JWT_PUBLIC_KEY=.*|JWT_PUBLIC_KEY=$PUB_B64|" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
else
    echo "JWT_PUBLIC_KEY=$PUB_B64" >> "$ENV_FILE"
fi

# Update or add JWT_KEY_ID
if grep -q "^JWT_KEY_ID=" "$ENV_FILE"; then
    sed "s|^JWT_KEY_ID=.*|JWT_KEY_ID=$KID|" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
else
    echo "JWT_KEY_ID=$KID" >> "$ENV_FILE"
fi

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
echo "Bootstrapped kid=$KID. Restart-safe: user-service reads JWT_* from .env."
echo "Rotation: re-run with a new KID, keep old key in kong.yml + JWKS until old tokens expire."
