#!/usr/bin/env bash
set -euo pipefail

if [[ ${CI_LOAD_TEST:-} != true ]]; then
    echo "CI_LOAD_TEST must be set to true" >&2
    exit 1
fi

if [[ -z ${BASE_URL:-} ]]; then
    echo "BASE_URL is required" >&2
    exit 1
fi

if [[ ${BASE_URL} != https://* ]]; then
    echo "BASE_URL must use HTTPS" >&2
    exit 1
fi

if [[ -z ${STACK_NAME:-} ]]; then
    echo "STACK_NAME is required" >&2
    exit 1
fi

: "${AWS_REGION:?AWS_REGION is required}"

for command in docker bash; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "required command is unavailable: $command" >&2
        exit 1
    fi
done

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
create_fixtures="$script_dir/create-fixtures.sh"
delete_fixtures="$script_dir/delete-fixtures.sh"
k6_script="$script_dir/k6.js"

if [[ ! -x $create_fixtures ]]; then
    echo "create-fixtures.sh is missing or not executable" >&2
    exit 1
fi
if [[ ! -x $delete_fixtures ]]; then
    echo "delete-fixtures.sh is missing or not executable" >&2
    exit 1
fi
if [[ ! -f $k6_script ]]; then
    echo "k6.js is missing" >&2
    exit 1
fi

k6_image=${K6_IMAGE:-grafana/k6:0.54.0}

fixture_file=$(mktemp)
chmod 600 "$fixture_file"

cleanup() {
    local status=$?
    if [[ -f $fixture_file ]]; then
        CI_LOAD_TEST=true BASE_URL="$BASE_URL" AWS_REGION="$AWS_REGION" \
            K6_FIXTURE_FILE="$fixture_file" bash "$delete_fixtures" || true
    fi
    exit "$status"
}
trap cleanup EXIT

CI_LOAD_TEST=true BASE_URL="$BASE_URL" STACK_NAME="$STACK_NAME" AWS_REGION="$AWS_REGION" \
    K6_FIXTURE_FILE="$fixture_file" bash "$create_fixtures" >/dev/null

if [[ ! -s $fixture_file ]]; then
    echo "fixture file was not created" >&2
    exit 1
fi

docker run --rm \
    --network host \
    -e BASE_URL="$BASE_URL" \
    -e K6_FIXTURE_FILE="$fixture_file" \
    -v "$k6_script:/k6/k6.js:ro" \
    -v "$fixture_file:$fixture_file:ro" \
    "$k6_image" run /k6/k6.js
