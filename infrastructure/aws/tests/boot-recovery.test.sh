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
printf '%s IMAGE_TAG=%s\n' "$*" "${IMAGE_TAG:-}" >>"$DOCKER_LOG"
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

echo "boot recovery contract: PASS"
