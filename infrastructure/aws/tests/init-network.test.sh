#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
mkdir -p "$fixture/bin"

password=$(printf '1%.0s' {1..64})
jq -n --arg password "$password" '{
  databases: {
    animals: {username: "animals_app", passwordHex: $password},
    users: {username: "users_app", passwordHex: $password},
    adopters: {username: "adopters_app", passwordHex: $password}
  }
}' >"$fixture/app.json"
jq -n '{username: "postgres", password: "fixture-password"}' >"$fixture/rds.json"
touch "$fixture/deployment.env" "$fixture/docker-compose.prod.yml"

cat >"$fixture/bin/aws" <<'EOF'
#!/usr/bin/env bash
if [[ $* == *'app-secret'* ]]; then
    cat "$FIXTURE_DIR/app.json"
else
    cat "$FIXTURE_DIR/rds.json"
fi
EOF
cat >"$fixture/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "$1 $2" in
    'compose --env-file')
        printf 'compose-config\n' >>"$EVENTS"
        printf '%s\n' '{"name":"ci-dynamic","networks":{"backend":{"name":"ci-dynamic_backend"}}}'
        ;;
    'network inspect')
        printf 'network-inspect\n' >>"$EVENTS"
        [[ $# == 3 && $3 == ci-dynamic_backend ]] || exit 1
        [[ -f $NETWORK_STATE ]] || exit 1
        if [[ $(<"$NETWORK_STATE") == good ]]; then
            printf '%s\n' '[{"Labels":{"com.docker.compose.project":"ci-dynamic","com.docker.compose.network":"backend"}}]'
        else
            printf '%s\n' '[{"Labels":{"com.docker.compose.project":"other","com.docker.compose.network":"backend"}}]'
        fi
        ;;
    'network create')
        printf 'network-create\n' >>"$EVENTS"
        [[ $# == 7 && $3 == --label && $4 == com.docker.compose.project=ci-dynamic &&
            $5 == --label && $6 == com.docker.compose.network=backend &&
            $7 == ci-dynamic_backend ]] || exit 1
        [[ ${FAIL_NETWORK_CREATE:-0} != 1 ]] || exit 1
        printf 'good\n' >"$NETWORK_STATE"
        ;;
    'run --rm')
        printf 'database-run\n' >>"$EVENTS"
        [[ $3 == --network && $4 == ci-dynamic_backend ]] || exit 1
        [[ -f $NETWORK_STATE ]]
        ;;
    *) echo "unexpected Docker call: $*" >&2; exit 1 ;;
esac
EOF
chmod +x "$fixture/bin/aws" "$fixture/bin/docker"

export FIXTURE_DIR="$fixture"
export EVENTS="$fixture/events"
export NETWORK_STATE="$fixture/network-state"
export PATH="$fixture/bin:$PATH"
export ALLOW_NON_ROOT_TEST=1
export AWS_REGION=eu-west-2
export APP_SECRET_ARN=app-secret
export RDS_SECRET_ARN=rds-secret
export RDS_ENDPOINT=db.example.internal
export DEPLOYMENT_ENV_FILE="$fixture/deployment.env"
export COMPOSE_FILE="$fixture/docker-compose.prod.yml"

bash "$repo_root/infrastructure/aws/init-databases.sh" >/dev/null
[[ $(cat "$EVENTS") == $'compose-config\nnetwork-inspect\nnetwork-create\ndatabase-run' ]]

: >"$EVENTS"
bash "$repo_root/infrastructure/aws/init-databases.sh" >/dev/null
[[ $(cat "$EVENTS") == $'compose-config\nnetwork-inspect\ndatabase-run' ]]

printf 'wrong\n' >"$NETWORK_STATE"
: >"$EVENTS"
if bash "$repo_root/infrastructure/aws/init-databases.sh" >"$fixture/error" 2>&1; then
    echo "mislabeled network unexpectedly accepted" >&2
    exit 1
fi
[[ $(cat "$EVENTS") == $'compose-config\nnetwork-inspect' ]]

rm "$NETWORK_STATE"
: >"$EVENTS"
export FAIL_NETWORK_CREATE=1
if bash "$repo_root/infrastructure/aws/init-databases.sh" >"$fixture/error" 2>&1; then
    echo "failed network creation unexpectedly accepted" >&2
    exit 1
fi
[[ $(cat "$EVENTS") == $'compose-config\nnetwork-inspect\nnetwork-create' ]]

echo "database network bootstrap contract: PASS"
