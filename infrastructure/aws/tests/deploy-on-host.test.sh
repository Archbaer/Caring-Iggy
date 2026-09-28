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

printf 'unexpected\n' >"$source_dir/extra-file"
if "$subject" install "$source_dir" >/dev/null 2>&1; then
    echo "install accepted non-allowlisted file" >&2
    exit 1
fi

echo "host immutable release contract: PASS"
