#!/bin/bash

# Bootstrap JWT keypair for Kong gateway + user-service
# Generates RSA-2048 keypair, stores in .env, pastes public key to kong.yml
# Run once at deploy/bootstrap; restart-safe: all instances read from shared .env

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$INFRA_DIR/.env"
KONG_FILE="$INFRA_DIR/kong/kong.yml"

KID="ci-key-1"

# Step 1: Generate RSA-2048 keypair (PKCS#8 private, SPKI public)
echo "Generating RSA-2048 keypair..."
openssl genrsa -out "$SCRIPT_DIR/tmp-private.pem" 2048 2>/dev/null
openssl pkcs8 -topk8 -inform PEM -outform PEM -in "$SCRIPT_DIR/tmp-private.pem" \
    -out "$SCRIPT_DIR/tmp-private-pkcs8.pem" -nocrypt
mv "$SCRIPT_DIR/tmp-private-pkcs8.pem" "$SCRIPT_DIR/tmp-private.pem"

openssl rsa -in "$SCRIPT_DIR/tmp-private.pem" -pubout -out "$SCRIPT_DIR/tmp-public.pem" 2>/dev/null

# Step 2: Base64 encode keypair
PRIV_B64=$(base64 -i "$SCRIPT_DIR/tmp-private.pem" | tr -d '\n')
PUB_B64=$(base64 -i "$SCRIPT_DIR/tmp-public.pem" | tr -d '\n')

# Step 3: Write to .env (upsert existing entries or append)
echo "Writing keys to $ENV_FILE..."

# Initialize .env if it doesn't exist
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

# Update or add JWT_PRIVATE_KEY
if grep -q "^JWT_PRIVATE_KEY=" "$ENV_FILE"; then
    sed -i '' "s|^JWT_PRIVATE_KEY=.*|JWT_PRIVATE_KEY=$PRIV_B64|" "$ENV_FILE"
else
    echo "JWT_PRIVATE_KEY=$PRIV_B64" >> "$ENV_FILE"
fi

# Update or add JWT_PUBLIC_KEY
if grep -q "^JWT_PUBLIC_KEY=" "$ENV_FILE"; then
    sed -i '' "s|^JWT_PUBLIC_KEY=.*|JWT_PUBLIC_KEY=$PUB_B64|" "$ENV_FILE"
else
    echo "JWT_PUBLIC_KEY=$PUB_B64" >> "$ENV_FILE"
fi

# Update or add JWT_KEY_ID
if grep -q "^JWT_KEY_ID=" "$ENV_FILE"; then
    sed -i '' "s|^JWT_KEY_ID=.*|JWT_KEY_ID=$KID|" "$ENV_FILE"
else
    echo "JWT_KEY_ID=$KID" >> "$ENV_FILE"
fi

# Step 4: Create kong.yml skeleton if it doesn't exist
if [ ! -f "$KONG_FILE" ]; then
    echo "Creating Kong config skeleton..."
    mkdir -p "$INFRA_DIR/kong"
    cat > "$KONG_FILE" << 'EOF'
_format_version: "3.0"
_transform: true

# NOTE: full services/routes/plugins config is added in a later checkpoint (CP5).

# --- BEGIN JWT PUBLIC KEY (managed by bootstrap-keys.sh) ---
<PASTE contents of public.pem here>
# --- END JWT PUBLIC KEY ---
EOF
fi

# Step 5: Paste public key into kong.yml (replace placeholder, preserve indentation)
echo "Injecting public key into $KONG_FILE..."

# Replace placeholder with actual public key file contents using sed + file read
TEMP_KONG=$(mktemp)
sed "/<PASTE contents of public\.pem here>/ {
r $SCRIPT_DIR/tmp-public.pem
d
}" "$KONG_FILE" > "$TEMP_KONG"
mv "$TEMP_KONG" "$KONG_FILE"

# Step 6: Delete temp files
echo "Cleaning up temp files..."
rm -f "$SCRIPT_DIR/tmp-private.pem" "$SCRIPT_DIR/tmp-public.pem"

echo ""
echo "Bootstrapped kid=$KID. Restart-safe: user-service reads JWT_* from .env."
echo "Rotation: re-run with a new KID, keep old key in kong.yml + JWKS until old tokens expire."
