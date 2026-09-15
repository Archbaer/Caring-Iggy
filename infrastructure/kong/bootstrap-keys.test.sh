#!/bin/bash

# Test script for bootstrap-keys.sh
# Asserts postconditions: keys in .env, public key pasted to kong.yml, temp files deleted

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$INFRA_DIR/.env"
KONG_FILE="$INFRA_DIR/kong/kong.yml"

# Clean up from previous runs
rm -f "$ENV_FILE" "$KONG_FILE"

# Run bootstrap script
bash "$SCRIPT_DIR/bootstrap-keys.sh"

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

# Test 4: Public key content is in kong.yml
if ! grep -q "BEGIN PUBLIC KEY" "$KONG_FILE"; then
    echo "FAIL: BEGIN PUBLIC KEY not found in $KONG_FILE"
    exit 1
fi
echo "PASS: BEGIN PUBLIC KEY found in kong.yml"

# Test 5: Temp files are deleted
TEMP_PRIVATE="$SCRIPT_DIR/tmp-private.pem"
TEMP_PUBLIC="$SCRIPT_DIR/tmp-public.pem"
if [ -f "$TEMP_PRIVATE" ] || [ -f "$TEMP_PUBLIC" ]; then
    echo "FAIL: Temp files were not deleted"
    exit 1
fi
echo "PASS: Temp files deleted"

echo ""
echo "All tests passed!"
exit 0
