#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
start_script="$repo_root/infrastructure/aws/start-stack.sh"
service_unit="$repo_root/infrastructure/aws/caring-iggy.service"

[[ -x "$start_script" ]] || {
    echo "start-stack.sh is missing" >&2
    exit 1
}
[[ -f "$service_unit" ]] || {
    echo "caring-iggy.service is missing" >&2
    exit 1
}

grep -Fqx 'Wants=network-online.target' "$service_unit"
grep -Fqx 'After=network-online.target docker.service' "$service_unit"
grep -Fqx 'StartLimitIntervalSec=0' "$service_unit"
grep -Fqx 'Type=oneshot' "$service_unit"
grep -Fqx 'RemainAfterExit=yes' "$service_unit"
grep -Fqx 'ExecStart=/opt/caring-iggy/start-stack.sh' "$service_unit"
grep -Fqx 'Restart=on-failure' "$service_unit"
grep -Fqx 'RestartSec=5min' "$service_unit"

fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT
bin_dir="$fixture_dir/bin"
install_dir="$fixture_dir/install"
runtime_dir="$fixture_dir/runtime"
mkdir -p "$bin_dir" "$install_dir" "$runtime_dir"
touch "$install_dir/docker-compose.prod.yml"
cat >"$fixture_dir/deployment.env" <<'EOF'
DOCKER_IMAGE_PREFIX=example/caring-iggy
IMAGE_TAG=sha-0123456789ab
APP_ORIGIN=https://192.0.2.10
RDS_ENDPOINT=db.example.internal
AWS_REGION=eu-west-2
APP_SECRET_ARN=app-secret
RDS_SECRET_ARN=rds-secret
EOF

cat >"$bin_dir/sleep" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$1" >>"$SLEEP_LOG"
EOF
cat >"$bin_dir/systemctl" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$SYSTEMCTL_LOG"
EOF
cat >"$bin_dir/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s IMAGE_TAG=%s\n' "$*" "${IMAGE_TAG:-}" >>"$DOCKER_LOG"
if [[ $* == *' config --no-env-resolution --format json' ]]; then
    printf '%s\n' '{"name":"caring-iggy","networks":{"backend":{"name":"caring-iggy_backend"}}}'
elif [[ ${1:-} == network && ${2:-} == inspect ]]; then
    [[ $# == 3 && $3 == caring-iggy_backend ]] || exit 1
    [[ -f $NETWORK_STATE ]] || exit 1
    printf '%s\n' '[{"Labels":{"com.docker.compose.project":"caring-iggy","com.docker.compose.network":"backend"}}]'
elif [[ ${1:-} == network && ${2:-} == create ]]; then
    [[ $# == 7 && $3 == --label && $4 == com.docker.compose.project=caring-iggy &&
        $5 == --label && $6 == com.docker.compose.network=backend &&
        $7 == caring-iggy_backend ]] || exit 1
    [[ ${FAIL_NETWORK_CREATE:-0} != 1 ]] || exit 1
    touch "$NETWORK_STATE"
elif [[ ${1:-} == run ]]; then
    [[ $3 == --network && $4 == caring-iggy_backend ]] || exit 1
    [[ -f $NETWORK_STATE ]]
fi
EOF
chmod +x "$bin_dir/sleep" "$bin_dir/systemctl" "$bin_dir/docker"

cat >"$install_dir/prepare-runtime.sh" <<'EOF'
#!/usr/bin/env bash
count=0
[[ -f "$ATTEMPT_FILE" ]] && read -r count <"$ATTEMPT_FILE"
count=$((count + 1))
printf '%s\n' "$count" >"$ATTEMPT_FILE"
if ((count <= FAIL_PREPARE_ATTEMPTS)); then
    exit 1
fi
EOF
cat >"$install_dir/init-databases.sh" <<'EOF'
#!/usr/bin/env bash
printf 'init\n' >>"$SEQUENCE_LOG"
EOF
chmod +x "$install_dir/prepare-runtime.sh" "$install_dir/init-databases.sh"

export ATTEMPT_FILE="$fixture_dir/attempts"
export SLEEP_LOG="$fixture_dir/sleeps"
export SYSTEMCTL_LOG="$fixture_dir/systemctl"
export DOCKER_LOG="$fixture_dir/docker"
export SEQUENCE_LOG="$fixture_dir/sequence"
export NETWORK_STATE="$fixture_dir/network-state"

run_start_stack() {
    PATH="$bin_dir:$PATH" \
    ALLOW_NON_ROOT_TEST=1 \
    INSTALL_DIR="$install_dir" \
    RUNTIME_DIR="$runtime_dir" \
    DEPLOYMENT_ENV_FILE="$fixture_dir/deployment.env" \
    CURRENT_IMAGE_TAG_FILE="$fixture_dir/current-image-tag" \
        bash "$start_script" >"$fixture_dir/output.log" 2>&1
}

export FAIL_PREPARE_ATTEMPTS=6
if run_start_stack; then
    echo "six failed preparations unexpectedly succeeded" >&2
    exit 1
fi
[[ $(<"$ATTEMPT_FILE") == 6 ]]
[[ $(cat "$SLEEP_LOG") == $'1\n2\n4\n8\n16' ]]
[[ ! -s "$DOCKER_LOG" ]]
[[ ! -s "$SYSTEMCTL_LOG" ]]

: >"$ATTEMPT_FILE"
: >"$SLEEP_LOG"
: >"$SYSTEMCTL_LOG"
: >"$DOCKER_LOG"
: >"$SEQUENCE_LOG"
export FAIL_PREPARE_ATTEMPTS=2
printf '%s\n' sha-fedcba987654 >"$fixture_dir/current-image-tag"
run_start_stack
[[ $(<"$ATTEMPT_FILE") == 3 ]]
[[ $(cat "$SLEEP_LOG") == $'1\n2' ]]
grep -Fq 'compose' "$DOCKER_LOG"
grep -Fq 'IMAGE_TAG=sha-fedcba987654' "$DOCKER_LOG"
grep -Fqx 'reset-failed caring-iggy.service' "$SYSTEMCTL_LOG"

cp "$repo_root/infrastructure/aws/init-databases.sh" "$install_dir/init-databases.sh"
password=$(printf '1%.0s' {1..64})
jq -n --arg password "$password" '{databases: {
    animals: {username: "animals_app", passwordHex: $password},
    users: {username: "users_app", passwordHex: $password},
    adopters: {username: "adopters_app", passwordHex: $password}
}}' >"$fixture_dir/app-secret.json"
jq -n '{username: "postgres", password: "fixture-password"}' >"$fixture_dir/rds-secret.json"
cat >"$bin_dir/aws" <<'EOF'
#!/usr/bin/env bash
if [[ $* == *'app-secret'* ]]; then cat "$APP_SECRET_FIXTURE"; else cat "$RDS_SECRET_FIXTURE"; fi
EOF
chmod +x "$bin_dir/aws"
export APP_SECRET_FIXTURE="$fixture_dir/app-secret.json"
export RDS_SECRET_FIXTURE="$fixture_dir/rds-secret.json"
export FAIL_PREPARE_ATTEMPTS=0
: >"$DOCKER_LOG"
: >"$ATTEMPT_FILE"
run_start_stack
create_line=$(grep -n '^network create ' "$DOCKER_LOG" | head -1 | cut -d: -f1)
run_line=$(grep -n '^run --rm ' "$DOCKER_LOG" | head -1 | cut -d: -f1)
pull_line=$(grep -n '^compose .* pull ' "$DOCKER_LOG" | head -1 | cut -d: -f1)
((create_line < run_line && run_line < pull_line))

rm "$NETWORK_STATE"
: >"$DOCKER_LOG"
: >"$ATTEMPT_FILE"
export FAIL_NETWORK_CREATE=1
if run_start_stack; then
    echo "boot recovery continued after backend network creation failed" >&2
    exit 1
fi
if grep -Eq '^(run |compose .* (pull|up) )' "$DOCKER_LOG"; then
    echo "boot recovery started database or application after network failure" >&2
    exit 1
fi

echo "boot recovery contract: PASS"
