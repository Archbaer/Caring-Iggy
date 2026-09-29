#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$repo_root"

scan_files=()
while IFS= read -r line; do
    scan_files+=("$line")
done < <(
    git ls-files \
        'infrastructure/aws/*' \
        'backend/*/src/main/resources/db/migration/*' |
        awk '!/^infrastructure\/aws\/tests\//'
)

((${#scan_files[@]} > 0)) || {
    echo "secret scan has no tracked inputs" >&2
    exit 1
}

fail_if_found() {
    local label=$1 pattern=$2
    if git grep -n -I -E -e "$pattern" -- "${scan_files[@]}"; then
        echo "tracked-secret scan found $label" >&2
        exit 1
    fi
}

fail_if_found 'a private key' '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
fail_if_found 'an AWS access key' 'A(KIA|SIA)[0-9A-Z]{16}'
fail_if_found 'a fixture password' '(Change[Mm]e|changeme|admin123|password123|master-fixture-password)'
fail_if_found 'a mutable production image tag' 'image:[[:space:]]*[^#[:space:]]+:latest([[:space:]]|$)|IMAGE_TAG[^\n]*:-latest'

echo "tracked deployment secret scan: PASS"
