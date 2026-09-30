#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$repo_root"

scan_files=()
while IFS= read -r line; do
    scan_files+=("$line")
done < <(
    git ls-files \
        'infrastructure/aws/**' \
        'backend/*/src/main/resources/db/migration/**'
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

private_key_pattern='-----BEGIN '
private_key_pattern+='([A-Z0-9]+ )*'
private_key_pattern+='PRIVATE KEY-----'
for key_type in 'ENCRYPTED' 'DSA'; do
    test_header="-----BEGIN $key_type PRIVATE KEY-----"
    if ! grep -Eq -e "$private_key_pattern" <<<"$test_header"; then
        echo "private-key scanner missed a $key_type PEM header" >&2
        exit 1
    fi
done
fail_if_found 'a private key' "$private_key_pattern"

aws_key_pattern='A(KIA|SIA)'
aws_key_pattern+='[0-9A-Z]{16}'
fail_if_found 'an AWS access key' "$aws_key_pattern"

password_pattern='(Change[Mm]e|change'
password_pattern+='me|admin'
password_pattern+='123|password'
password_pattern+='123|master-fixture'
password_pattern+='-password)'
fail_if_found 'a fixture password' "$password_pattern"

latest_pattern='image:[[:space:]]*[^#[:space:]]+:'
latest_pattern+='latest([[:space:]]|$)|IMAGE_TAG[^\n]*:-'
latest_pattern+='latest'
fail_if_found 'a mutable production image tag' "$latest_pattern"

echo "tracked deployment secret scan: PASS"
