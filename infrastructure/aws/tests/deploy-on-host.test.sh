#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
subject="$repo_root/infrastructure/aws/deploy-on-host.sh"
[[ -x $subject ]] || {
    echo "deploy-on-host.sh is missing" >&2
    exit 1
}

fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
source_dir="$fixture/source"
install_dir="$fixture/opt/caring-iggy"
config_dir="$fixture/etc/caring-iggy"
runtime_dir="$fixture/run/caring-iggy"
systemd_dir="$fixture/systemd"
bin_dir="$fixture/bin"
log="$fixture/actions.log"
mkdir -p "$source_dir" "$systemd_dir" "$bin_dir"

cp "$repo_root/infrastructure/aws/"{Caddyfile.template,kong.prod.yml.template,docker-compose.prod.yml,caring-iggy.service} "$source_dir/"
cp "$subject" "$source_dir/deploy-on-host.sh"
for helper in prepare-runtime.sh init-databases.sh bootstrap-admin.sh start-stack.sh; do
    cat >"$source_dir/$helper" <<EOF
#!/usr/bin/env bash
printf '$helper IMAGE_TAG=%s\n' "\${IMAGE_TAG:-}" >>"\$ACTION_LOG"
EOF
done

cat >"$bin_dir/systemctl" <<'EOF'
#!/usr/bin/env bash
printf 'systemctl %s\n' "$*" >>"$ACTION_LOG"
EOF
cat >"$bin_dir/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'docker %s IMAGE_TAG=%s\n' "$*" "${IMAGE_TAG:-}" >>"$ACTION_LOG"
if [[ $* == *' config --no-env-resolution --format json' ]]; then
    [[ -f ${3:-} && ${3:-} == "$CONFIG_DIR/deployment.env" ]] || exit 1
    printf '%s\n' '{"name":"caring-iggy","networks":{"backend":{"name":"caring-iggy_backend"}}}'
    exit 0
elif [[ ${1:-} == network && ${2:-} == inspect ]]; then
    [[ $# == 3 && $3 == caring-iggy_backend ]] || exit 1
    [[ -f $NETWORK_STATE ]] || exit 1
    printf '%s\n' '[{"Labels":{"com.docker.compose.project":"caring-iggy","com.docker.compose.network":"backend"}}]'
    exit 0
elif [[ ${1:-} == network && ${2:-} == create ]]; then
    [[ $# == 7 && $3 == --label && $4 == com.docker.compose.project=caring-iggy &&
        $5 == --label && $6 == com.docker.compose.network=backend &&
        $7 == caring-iggy_backend ]] || exit 1
    [[ ${FAIL_NETWORK_CREATE:-0} != 1 ]] || exit 1
    touch "$NETWORK_STATE"
    exit 0
elif [[ ${1:-} == run ]]; then
    [[ $3 == --network && $4 == caring-iggy_backend ]] || exit 1
    [[ -f $NETWORK_STATE ]]
    exit 0
fi
if [[ $* == *' ps --services' ]]; then
    printf '%s\n' caddy kong animal-service adopter-service user-service matching-service reporting-service frontend
elif [[ $* == *' ps -q '* ]]; then
    printf 'container-%s\n' "${*: -1}"
elif [[ ${1:-} == inspect ]]; then
    id=${*: -1}
    if [[ -n ${FAIL_HEALTH_SERVICE:-} && $id == "container-$FAIL_HEALTH_SERVICE" ]]; then
        echo unhealthy
    else
        echo healthy
    fi
fi
EOF
chmod +x "$bin_dir/"*

export ACTION_LOG="$log"
export NETWORK_STATE="$fixture/network-state"
export ALLOW_NON_ROOT_TEST=1
export INSTALL_DIR="$install_dir"
export CONFIG_DIR="$config_dir"
export RUNTIME_DIR="$runtime_dir"
export SYSTEMD_DIR="$systemd_dir"
export PATH="$bin_dir:$PATH"
export AWS_REGION=eu-west-2
export APP_SECRET_ARN=arn:aws:secretsmanager:eu-west-2:123456789012:secret:app
export RDS_SECRET_ARN=arn:aws:secretsmanager:eu-west-2:123456789012:secret:rds
export RDS_ENDPOINT=db.example.internal
export DOCKER_IMAGE_PREFIX=example-owner/caring-iggy
export APP_ORIGIN=https://192.0.2.10

"$subject" install "$source_dir"
[[ -x "$install_dir/deploy-on-host.sh" ]]
[[ -f "$systemd_dir/caring-iggy.service" ]]
grep -Fxq 'AWS_REGION=eu-west-2' "$config_dir/deployment.env"
if grep -Eiq 'password|private|secretHex' "$config_dir/deployment.env"; then
    echo "deployment.env contains secret material" >&2
    exit 1
fi
grep -Fq 'systemctl enable caring-iggy.service' "$log"

printf '%s\n' sha-aaaaaaaaaaaa >"$config_dir/current-image-tag"
"$subject" release sha-bbbbbbbbbbbb
grep -Fxq sha-aaaaaaaaaaaa "$config_dir/current-image-tag"
grep -Fxq sha-aaaaaaaaaaaa "$config_dir/previous-image-tag"
grep -Fxq sha-bbbbbbbbbbbb "$config_dir/candidate-image-tag"
grep -Fxq sha-bbbbbbbbbbbb "$config_dir/candidate-ready"
"$subject" promote sha-bbbbbbbbbbbb
grep -Fxq sha-bbbbbbbbbbbb "$config_dir/current-image-tag"
[[ ! -e "$config_dir/candidate-image-tag" ]]

"$subject" rollback
grep -Fxq sha-aaaaaaaaaaaa "$config_dir/current-image-tag"
grep -Fq 'IMAGE_TAG=sha-aaaaaaaaaaaa' "$log"

printf '%s\n' sha-aaaaaaaaaaaa >"$config_dir/current-image-tag"
export FAIL_HEALTH_SERVICE=user-service
if "$subject" release sha-cccccccccccc >/dev/null 2>&1; then
    echo "unhealthy release succeeded" >&2
    exit 1
fi
grep -Fxq sha-aaaaaaaaaaaa "$config_dir/current-image-tag"
grep -Fxq sha-cccccccccccc "$config_dir/candidate-image-tag"
unset FAIL_HEALTH_SERVICE
"$subject" rollback
grep -Fxq sha-aaaaaaaaaaaa "$config_dir/current-image-tag"

rm -f "$config_dir/current-image-tag" "$config_dir/previous-image-tag"
"$subject" release sha-dddddddddddd
if "$subject" rollback >"$fixture/rollback.log" 2>&1; then
    echo "first-release rollback unexpectedly succeeded" >&2
    exit 1
fi
grep -Fq 'rollback unavailable' "$fixture/rollback.log"
[[ ! -e "$config_dir/current-image-tag" ]]
[[ ! -e "$config_dir/candidate-ready" ]]

cp "$repo_root/infrastructure/aws/init-databases.sh" "$install_dir/init-databases.sh"
password=$(printf '1%.0s' {1..64})
jq -n --arg password "$password" '{databases: {
    animals: {username: "animals_app", passwordHex: $password},
    users: {username: "users_app", passwordHex: $password},
    adopters: {username: "adopters_app", passwordHex: $password}
}}' >"$fixture/app-secret.json"
jq -n '{username: "postgres", password: "fixture-password"}' >"$fixture/rds-secret.json"
cat >"$bin_dir/aws" <<'EOF'
#!/usr/bin/env bash
if [[ $* == *'secret:app'* ]]; then cat "$APP_SECRET_FIXTURE"; else cat "$RDS_SECRET_FIXTURE"; fi
EOF
chmod +x "$bin_dir/aws"
export APP_SECRET_FIXTURE="$fixture/app-secret.json"
export RDS_SECRET_FIXTURE="$fixture/rds-secret.json"
: >"$log"
"$subject" release sha-eeeeeeeeeeee
prepare_line=$(grep -n '^prepare-runtime.sh ' "$log" | head -1 | cut -d: -f1)
create_line=$(grep -n '^docker network create ' "$log" | head -1 | cut -d: -f1)
run_line=$(grep -n '^docker run ' "$log" | head -1 | cut -d: -f1)
pull_line=$(grep -n '^docker compose .* pull ' "$log" | head -1 | cut -d: -f1)
((prepare_line < create_line && create_line < run_line && run_line < pull_line))

rm "$NETWORK_STATE"
: >"$log"
export FAIL_NETWORK_CREATE=1
if "$subject" release sha-ffffffffffff >/dev/null 2>&1; then
    echo "release continued after backend network creation failed" >&2
    exit 1
fi
if grep -Eq '^docker (run |compose .* (pull|up) )' "$log"; then
    echo "release continued to database or application startup after network failure" >&2
    exit 1
fi
unset FAIL_NETWORK_CREATE

printf 'unexpected\n' >"$source_dir/extra-file"
if "$subject" install "$source_dir" >/dev/null 2>&1; then
    echo "install accepted non-allowlisted file" >&2
    exit 1
fi

echo "host immutable release contract: PASS"
