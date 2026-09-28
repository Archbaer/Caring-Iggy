#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
compose_file="$repo_root/infrastructure/aws/docker-compose.prod.yml"
fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT

runtime_dir="$fixture_dir/runtime"
mkdir -p "$runtime_dir"
for service in animal-service adopter-service user-service frontend; do
    printf '# test fixture\n' >"$runtime_dir/$service.env"
done
printf '# test Kong configuration\n' >"$runtime_dir/kong.yml"

deployment_env="$fixture_dir/deployment.env"
cat >"$deployment_env" <<'EOF'
DOCKER_IMAGE_PREFIX=example/caring-iggy
IMAGE_TAG=sha-0123456789ab
APP_ORIGIN=https://192.0.2.10
RDS_ENDPOINT=db.example.internal
AWS_REGION=eu-west-2
EOF

rendered="$fixture_dir/compose.json"
RUNTIME_DIR="$runtime_dir" docker compose \
    --env-file "$deployment_env" \
    -f "$compose_file" \
    config --format json >"$rendered"

jq -e '.services | length == 8' "$rendered" >/dev/null
jq -e '[.services[] | has("build")] | any | not' "$rendered" >/dev/null
jq -e '[.services[] | has("container_name")] | any | not' "$rendered" >/dev/null
jq -e '[.services | keys[] | test("postgres"; "i")] | any | not' "$rendered" >/dev/null
jq -e '
    [.services | to_entries[] | .value.ports[]? |
        {service: input_filename, target: .target, published: .published}] | length == 2
' "$rendered" >/dev/null
jq -e '
    [.services | to_entries[] | .key as $service | .value.ports[]? |
        {service: $service, target: .target, published: (.published | tonumber)}]
    == [
        {service: "caddy", target: 80, published: 80},
        {service: "caddy", target: 443, published: 443}
    ]
' "$rendered" >/dev/null
jq -e '.networks | has("edge") and has("backend")' "$rendered" >/dev/null
jq -e '.networks.edge.ipam.config[0].subnet == "172.30.0.0/24"' "$rendered" >/dev/null
jq -e '[.services[] | .restart == "unless-stopped"] | all' "$rendered" >/dev/null
jq -e '[.services[] | .logging.options["max-size"] == "10m" and .logging.options["max-file"] == "3"] | all' "$rendered" >/dev/null
jq -e '.services.caddy.image == "caddy:2.11.4@sha256:040e9f7480b80b6d4a7e5013a21159b950a63dcbdb956e38abe2387fb28d9ec0"' "$rendered" >/dev/null
jq -e '.services.kong.image == "kong:3.9.3@sha256:d56dba2a916b7bb842ec0b5caae3e0956b18afc10119ea90203a41650c01f7c9"' "$rendered" >/dev/null

grep -Fq 'profile shortlived' "$repo_root/infrastructure/aws/Caddyfile.template"
grep -Fq 'reverse_proxy frontend:3000' "$repo_root/infrastructure/aws/Caddyfile.template"
grep -Fq '__JWT_PUBLIC_KEY_PEM__' "$repo_root/infrastructure/aws/kong.prod.yml.template"
if grep -Eq 'name:[[:space:]]*cors' "$repo_root/infrastructure/aws/kong.prod.yml.template"; then
    echo "production Kong configuration must not enable CORS" >&2
    exit 1
fi

echo "production Compose contract: PASS"
