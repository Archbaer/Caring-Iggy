#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
ci="$repo_root/.github/workflows/ci.yml"
publish="$repo_root/.github/workflows/docker-publish.yml"

for workflow in "$ci" "$publish"; do
    [[ -f $workflow ]] || {
        echo "workflow is missing: $workflow" >&2
        exit 1
    }
    if grep -Eq 'id-token:[[:space:]]*write|secrets\.AWS_|aws-actions/|deploy-aws\.sh' "$workflow"; then
        echo "workflow contains AWS credentials, OIDC, or deployment" >&2
        exit 1
    fi
done

ci_commands=$(sed '/^[[:space:]]*#/d' "$ci")
publish_commands=$(sed '/^[[:space:]]*#/d' "$publish")
require_ci_command() {
    grep -Fq "$1" <<<"$ci_commands" || {
        echo "CI infrastructure contract is missing: $1" >&2
        exit 1
    }
}

require_publish_command() {
    grep -Fq "$1" <<<"$publish_commands" || {
        echo "Docker publish contract is missing: $1" >&2
        exit 1
    }
}

require_ci_command 'infrastructure-validation:'
require_ci_command 'shellcheck'
require_ci_command 'jq'
require_ci_command 'docker-compose-plugin'
require_ci_command 'docker compose version --short'
require_ci_command 'compose_minor < 30'
require_ci_command 'cfn-lint'
require_ci_command 'aquasecurity/trivy-action@'
require_ci_command 'for test in infrastructure/aws/tests/*.test.sh; do'
# shellcheck disable=SC2016
require_ci_command 'bash "$test"'
require_ci_command 'image-ref: caddy:2.11.4@sha256:040e9f7480b80b6d4a7e5013a21159b950a63dcbdb956e38abe2387fb28d9ec0'
require_ci_command 'image-ref: kong:3.9.3@sha256:d56dba2a916b7bb842ec0b5caae3e0956b18afc10119ea90203a41650c01f7c9'
require_ci_command 'severity: CRITICAL'
require_ci_command 'ignore-unfixed: true'
require_ci_command "exit-code: '1'"

# shellcheck disable=SC2016
require_publish_command 'VERSION="sha-${GITHUB_SHA::12}"'
require_publish_command 'aquasecurity/trivy-action@'
# shellcheck disable=SC2016
require_publish_command 'image-ref: ${{ env.DOCKER_IMAGE_PREFIX }}-${{ matrix.service }}:${{ steps.meta.outputs.version }}'

echo "CI deployment validation contract: PASS"
