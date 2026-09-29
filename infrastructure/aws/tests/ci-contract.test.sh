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

require_ci() {
    grep -Fq "$1" "$ci" || {
        echo "CI infrastructure contract is missing: $1" >&2
        exit 1
    }
}

require_ci 'infrastructure-validation:'
require_ci 'shellcheck'
require_ci 'cfn-lint'
require_ci 'aquasecurity/trivy-action@'
require_ci 'infrastructure/aws/tests/secret-scan.test.sh'
require_ci 'infrastructure/aws/tests/migration-data.test.sh'
require_ci 'infrastructure/aws/tests/production-compose.test.sh'
require_ci 'infrastructure/aws/tests/template.test.sh'
require_ci 'caddy:2.11.4@sha256:'
require_ci 'kong:3.9.3@sha256:'

# shellcheck disable=SC2016
grep -Fq 'VERSION="sha-${GITHUB_SHA::12}"' "$publish" || {
    echo "Docker publish lost immutable SHA tags" >&2
    exit 1
}
grep -Fq 'aquasecurity/trivy-action@' "$publish" || {
    echo "Docker publish lacks image vulnerability scan" >&2
    exit 1
}
# shellcheck disable=SC2016
grep -Fq 'image-ref: ${{ env.DOCKER_IMAGE_PREFIX }}-${{ matrix.service }}:${{ steps.meta.outputs.version }}' "$publish" || {
    echo "Trivy does not scan exact immutable application tag" >&2
    exit 1
}

echo "CI deployment validation contract: PASS"
