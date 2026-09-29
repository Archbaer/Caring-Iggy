#!/usr/bin/env bash
set -euo pipefail

root=${MIGRATION_ROOT:-}
if [[ -z "$root" ]]; then
    root=$(cd "$(dirname "$0")/../../.." && pwd)
fi

scan_migrations() {
    local status
    if grep -R -n -E "INSERT INTO (animals|adopters|employees|accounts)" "$@"; then
        echo "demo identities or animals found in production migrations" >&2
        return 1
    else
        status=$?
        if ((status != 1)); then
            echo "unable to scan production migrations" >&2
            return "$status"
        fi
    fi
}

scan_migrations "$root"/backend/*/src/main/resources/db/migration
