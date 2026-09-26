#!/bin/bash

# Test script for bootstrap-keys.sh
# Asserts postconditions: keys in .env, public key pasted to kong.yml, temp files deleted
# Runs against a COPY of the repo's kong dir in a temp dir — never touches the tracked kong.yml.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TEST_TMP=$(mktemp -d)
trap 'rm -rf "$TEST_TMP"' EXIT

mkdir -p "$TEST_TMP/kong"
cp "$SCRIPT_DIR/bootstrap-keys.sh" "$TEST_TMP/kong/bootstrap-keys.sh"
cp "$SCRIPT_DIR/kong.yml" "$TEST_TMP/kong/kong.yml"
TRACKED_KONG_HASH_BEFORE=$(openssl dgst -sha256 "$SCRIPT_DIR/kong.yml" | awk '{print $NF}')

ENV_FILE="$TEST_TMP/.env"
KONG_FILE="$TEST_TMP/kong/kong.yml"

# Exercise legacy dotenv formatting: whitespace around '=', duplicates, and no final newline.
printf '%s\n' \
    'DB_USER = "postgres"' \
    'JWT_PRIVATE_KEY = "stale-private"' \
    'JWT_PRIVATE_KEY=stale-duplicate' \
    'JWT_PUBLIC_KEY = "stale-public"' \
    'AUTH_SESSION_STATE_SECRET = "stale-session"' > "$ENV_FILE"
printf '%s' 'AUTH_CSRF_SECRET = "stale-csrf"' >> "$ENV_FILE"

# Run bootstrap script against the copy
bash "$TEST_TMP/kong/bootstrap-keys.sh"

# Test 1: JWT_PRIVATE_KEY is in .env
if ! grep -q "^JWT_PRIVATE_KEY=" "$ENV_FILE"; then
    echo "FAIL: JWT_PRIVATE_KEY not found in $ENV_FILE"
    exit 1
fi
echo "PASS: JWT_PRIVATE_KEY found in .env"

# Test 2: JWT_PUBLIC_KEY is in .env
if ! grep -q "^JWT_PUBLIC_KEY=" "$ENV_FILE"; then
    echo "FAIL: JWT_PUBLIC_KEY not found in $ENV_FILE"
    exit 1
fi
echo "PASS: JWT_PUBLIC_KEY found in .env"

# Test 3: JWT_KEY_ID is in .env
if ! grep -q "^JWT_KEY_ID=" "$ENV_FILE"; then
    echo "FAIL: JWT_KEY_ID not found in $ENV_FILE"
    exit 1
fi
echo "PASS: JWT_KEY_ID found in .env"

# Test 3b: Frontend auth secrets are generated as independent 32-byte hex values
SESSION_SECRET=$(sed -n 's/^AUTH_SESSION_STATE_SECRET=//p' "$ENV_FILE")
CSRF_SECRET=$(sed -n 's/^AUTH_CSRF_SECRET=//p' "$ENV_FILE")

if ! printf '%s\n' "$SESSION_SECRET" | grep -Eq '^[0-9a-f]{64}$'; then
    echo "FAIL: AUTH_SESSION_STATE_SECRET is missing or invalid"
    exit 1
fi
echo "PASS: AUTH_SESSION_STATE_SECRET is a 32-byte hex value"

if ! printf '%s\n' "$CSRF_SECRET" | grep -Eq '^[0-9a-f]{64}$'; then
    echo "FAIL: AUTH_CSRF_SECRET is missing or invalid"
    exit 1
fi
echo "PASS: AUTH_CSRF_SECRET is a 32-byte hex value"

if [ "$SESSION_SECRET" = "$CSRF_SECRET" ]; then
    echo "FAIL: frontend auth secrets must be different"
    exit 1
fi
echo "PASS: frontend auth secrets are different"

# Test 3c: managed keys are normalized and de-duplicated
for KEY in JWT_PRIVATE_KEY JWT_PUBLIC_KEY JWT_KEY_ID AUTH_SESSION_STATE_SECRET AUTH_CSRF_SECRET; do
    if [ "$(grep -Ec "^${KEY}=" "$ENV_FILE")" -ne 1 ]; then
        echo "FAIL: $KEY must have exactly one normalized entry"
        exit 1
    fi

    if grep -Eq "^[[:space:]]*${KEY}[[:space:]]+=" "$ENV_FILE"; then
        echo "FAIL: $KEY still has a whitespace-padded entry"
        exit 1
    fi
done
echo "PASS: managed .env entries normalized and de-duplicated"

# Test 4: Public key content is in kong.yml, placed under rsa_public_key: |
if ! grep -q "BEGIN PUBLIC KEY" "$KONG_FILE"; then
    echo "FAIL: BEGIN PUBLIC KEY not found in $KONG_FILE"
    exit 1
fi
echo "PASS: BEGIN PUBLIC KEY found in kong.yml"

if grep -q "PASTE contents of public.pem here" "$KONG_FILE"; then
    echo "FAIL: placeholder still present in $KONG_FILE after bootstrap"
    exit 1
fi
echo "PASS: placeholder replaced with real key in kong.yml"

if ! grep -q "^[[:space:]]*rsa_public_key: |" "$KONG_FILE"; then
    echo "FAIL: rsa_public_key block scalar not found in $KONG_FILE"
    exit 1
fi
echo "PASS: rsa_public_key: | present in kong.yml"

# Test 4b: kong.yml stays world-readable (the kong container user must read the bind mount)
if [ ! -r "$KONG_FILE" ] || [ "$(stat -f '%Lp' "$KONG_FILE" 2>/dev/null || stat -c '%a' "$KONG_FILE")" != "644" ]; then
    echo "FAIL: $KONG_FILE is not mode 644 after bootstrap"
    exit 1
fi
echo "PASS: kong.yml is mode 644"

# Test 5: Temp files are deleted
TEMP_PRIVATE="$TEST_TMP/kong/tmp-private.pem"
TEMP_PUBLIC="$TEST_TMP/kong/tmp-public.pem"
if [ -f "$TEMP_PRIVATE" ] || [ -f "$TEMP_PUBLIC" ]; then
    echo "FAIL: Temp files were not deleted"
    exit 1
fi
echo "PASS: Temp files deleted"

# Test 6: the real, tracked kong.yml was never touched by this test run
TRACKED_KONG_HASH_AFTER=$(openssl dgst -sha256 "$SCRIPT_DIR/kong.yml" | awk '{print $NF}')
if [ "$TRACKED_KONG_HASH_BEFORE" != "$TRACKED_KONG_HASH_AFTER" ]; then
    echo "FAIL: tracked kong.yml was modified by the test run"
    exit 1
fi
echo "PASS: tracked kong.yml untouched"

echo ""
echo "All tests passed!"
exit 0
