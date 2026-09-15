#!/bin/bash

# Test script for bootstrap-keys.sh
# Asserts postconditions: keys in .env, public key pasted to kong.yml, temp files deleted
# Runs against a COPY of the repo's kong dir in a temp dir — never touches the tracked kong.yml.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TEST_TMP=$(mktemp -d)
trap 'rm -rf "$TEST_TMP"' EXIT

mkdir -p "$TEST_TMP/kong"
cp "$SCRIPT_DIR/bootstrap-keys.sh" "$TEST_TMP/kong/bootstrap-keys.sh"
cp "$SCRIPT_DIR/kong.yml" "$TEST_TMP/kong/kong.yml"

ENV_FILE="$TEST_TMP/.env"
KONG_FILE="$TEST_TMP/kong/kong.yml"

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

# Test 5: Temp files are deleted
TEMP_PRIVATE="$TEST_TMP/kong/tmp-private.pem"
TEMP_PUBLIC="$TEST_TMP/kong/tmp-public.pem"
if [ -f "$TEMP_PRIVATE" ] || [ -f "$TEMP_PUBLIC" ]; then
    echo "FAIL: Temp files were not deleted"
    exit 1
fi
echo "PASS: Temp files deleted"

# Test 6: the real, tracked kong.yml was never touched by this test run
if ! grep -q "PASTE contents of public.pem here" "$SCRIPT_DIR/kong.yml"; then
    echo "FAIL: tracked kong.yml was modified by the test run"
    exit 1
fi
echo "PASS: tracked kong.yml untouched"

echo ""
echo "All tests passed!"
exit 0
