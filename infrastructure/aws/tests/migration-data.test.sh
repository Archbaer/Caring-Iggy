#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"

if rg -n "INSERT INTO (animals|adopters|employees|accounts)" \
    "$root"/backend/*/src/main/resources/db/migration; then
    echo "demo identities or animals found in production migrations" >&2
    exit 1
fi
