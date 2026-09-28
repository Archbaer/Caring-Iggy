#!/usr/bin/env bash
set -euo pipefail

if ((EUID != 0)) && [[ ${ALLOW_NON_ROOT_TEST:-0} != 1 ]]; then
    echo "start-stack must run as root" >&2
    exit 1
fi

install_dir=${INSTALL_DIR:-/opt/caring-iggy}
runtime_dir=${RUNTIME_DIR:-/run/caring-iggy}
deployment_env_file=${DEPLOYMENT_ENV_FILE:-/etc/caring-iggy/deployment.env}
compose_file="$install_dir/docker-compose.prod.yml"

for file in \
    "$deployment_env_file" \
    "$compose_file" \
    "$install_dir/prepare-runtime.sh" \
    "$install_dir/init-databases.sh"; do
    if [[ ! -f "$file" ]]; then
        echo "required runtime file is unavailable" >&2
        exit 1
    fi
done

set -a
# shellcheck disable=SC1090
source "$deployment_env_file"
set +a
export RUNTIME_DIR="$runtime_dir"

run_attempt() {
    "$install_dir/prepare-runtime.sh" &&
        "$install_dir/init-databases.sh" &&
        docker compose --env-file "$deployment_env_file" -f "$compose_file" pull &&
        docker compose --env-file "$deployment_env_file" -f "$compose_file" up -d --wait
}

attempt=1
max_attempts=6
delay=1

while ((attempt <= max_attempts)); do
    if run_attempt; then
        systemctl reset-failed caring-iggy.service >/dev/null 2>&1 || true
        echo "Caring Iggy stack is healthy"
        exit 0
    fi

    echo "stack start attempt $attempt of $max_attempts failed" >&2
    if ((attempt == max_attempts)); then
        break
    fi

    sleep "$delay"
    delay=$((delay * 2))
    if ((delay > 32)); then
        delay=32
    fi
    attempt=$((attempt + 1))
done

echo "stack start failed after $max_attempts attempts" >&2
exit 1
