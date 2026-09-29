#!/usr/bin/env bash
set +x
set -euo pipefail
umask 077
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
# shellcheck source=common.sh
source "$script_dir/common.sh"
require_environment
for command in docker bash; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "required command is unavailable: $command" >&2
        exit 1
    fi
done

create_fixtures="$script_dir/create-fixtures.sh"
delete_fixtures="$script_dir/delete-fixtures.sh"
k6_script="$script_dir/k6.js"

if [[ ! -f $create_fixtures ]]; then
    echo "create-fixtures.sh is missing" >&2
    exit 1
fi
if [[ ! -f $delete_fixtures ]]; then
    echo "delete-fixtures.sh is missing" >&2
    exit 1
fi
if [[ ! -f $k6_script ]]; then
    echo "k6.js is missing" >&2
    exit 1
fi

k6_image=${K6_IMAGE:-grafana/k6:0.54.0@sha256:1f40432b1cbe7234e977f96c362c9bc550a2d2b583d014dd8669fe40d3e9e755}
if [[ ! $k6_image =~ ^grafana/k6:[0-9]+\.[0-9]+\.[0-9]+@sha256:[a-f0-9]{64}$ ]]; then
    echo "K6_IMAGE must pin a grafana/k6 release version and sha256 digest" >&2
    exit 1
fi

fixture_file=${K6_FIXTURE_FILE:-$(mktemp)}
if [[ -s $fixture_file || -L $fixture_file ]]; then
    echo "fixture file must be empty and not a symlink" >&2
    exit 1
fi
: >"$fixture_file"
chmod 600 "$fixture_file"

cleanup() {
    local status=$?
    trap - EXIT
    trap '' INT TERM
    if [[ -s $fixture_file ]]; then
        if ! CI_LOAD_TEST=true BASE_URL="$BASE_URL" AWS_REGION="$AWS_REGION" STACK_NAME="$STACK_NAME" \
            K6_FIXTURE_FILE="$fixture_file" bash "$delete_fixtures"; then
            echo "fixture cleanup failed; fixture journal retained at $fixture_file" >&2
            ((status != 0)) || status=1
        fi
    elif [[ -f $fixture_file ]]; then
        rm -f "$fixture_file"
    fi
    exit "$status"
}
trap cleanup EXIT
trap 'signal_exit 130' INT
trap 'signal_exit 143' TERM

run_cancellable env CI_LOAD_TEST=true BASE_URL="$BASE_URL" STACK_NAME="$STACK_NAME" AWS_REGION="$AWS_REGION" \
    K6_FIXTURE_FILE="$fixture_file" bash "$create_fixtures" >/dev/null

if [[ ! -s $fixture_file ]]; then
    echo "fixture file was not created" >&2
    exit 1
fi

run_cancellable docker run --rm \
    --network host \
    --user "$(id -u):$(id -g)" \
    -e BASE_URL="$BASE_URL" \
    -e K6_FIXTURE_FILE=/k6/fixtures.json \
    -v "$k6_script:/k6/k6.js:ro" \
    -v "$fixture_file:/k6/fixtures.json:ro" \
    "$k6_image" run /k6/k6.js
