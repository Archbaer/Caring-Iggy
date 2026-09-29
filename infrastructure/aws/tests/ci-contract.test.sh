#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
python3 - "$repo_root" <<'PY'
import json
import pathlib
import re
import sys

import yaml

root = pathlib.Path(sys.argv[1])
ci_path = root / ".github/workflows/ci.yml"
publish_path = root / ".github/workflows/docker-publish.yml"

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def load_workflow(path):
    require(path.is_file(), f"workflow is missing: {path.name}")
    document = yaml.safe_load(path.read_text())
    require(isinstance(document, dict), f"workflow is invalid YAML: {path.name}")
    return document

def lines(step):
    script = step.get("run", "")
    return [line.strip() for line in script.splitlines()
            if line.strip() and not line.lstrip().startswith("#")]

def require_lines(step, required, message):
    actual = lines(step)
    for line in required:
        require(line in actual, f"{message}: missing executable line {line!r}")

ci = load_workflow(ci_path)
publish = load_workflow(publish_path)
require(ci.get("permissions") == {"contents": "read"},
        "CI workflow must keep read-only repository permissions")

ci_text = json.dumps(ci)
publish_text = json.dumps(publish)
for workflow_text in (ci_text, publish_text):
    require(not re.search(r'id-token[" ]*:[" ]*write|secrets\.AWS_|aws-actions/|deploy-aws\.sh', workflow_text),
            "workflow contains AWS credentials, OIDC, or deployment")

jobs = ci.get("jobs", {})
infrastructure = jobs.get("infrastructure-validation", {})
steps = infrastructure.get("steps", [])
require(steps, "CI infrastructure validation job is missing")

trivy_ref = "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25"
trivy_comment = "# Trivy action v0.36.0 pinned to immutable commit"
for workflow, path in ((ci, ci_path), (publish, publish_path)):
    all_steps = [step for job in workflow.get("jobs", {}).values()
                 for step in job.get("steps", [])]
    trivy_steps = [step for step in all_steps
                   if step.get("uses", "").startswith("aquasecurity/trivy-action@")]
    require(trivy_steps, f"Trivy action is missing: {path.name}")
    require(all(step.get("uses") == trivy_ref for step in trivy_steps),
            f"Trivy action must use immutable v0.36.0 commit: {path.name}")
    text = path.read_text()
    require(text.count(trivy_comment) == len(trivy_steps),
            f"Each Trivy action pin must identify v0.36.0: {path.name}")

tool_step = next((step for step in steps if step.get("name") == "Install validation tools"), None)
require(tool_step is not None, "CI tool installation step is missing")
require_lines(tool_step, [
    "sudo apt-get install -y shellcheck jq",
    "jq --version",
    "compose_version=$(docker compose version --short)",
    "if ((compose_major < 2 || (compose_major == 2 && compose_minor < 30))); then",
], "CI tool installation step")
require("docker-compose-plugin" not in lines(tool_step),
        "CI must use runner-provided Docker Compose")

shellcheck_step = next((step for step in steps if step.get("name") == "Lint shell scripts"), None)
require(shellcheck_step is not None
        and 'shellcheck "${scripts[@]}"' in lines(shellcheck_step),
        "ShellCheck step is not executable")
template_step = next((step for step in steps if step.get("name") == "Lint CloudFormation template"), None)
require(template_step is not None
        and "cfn-lint -r eu-west-2 -t infrastructure/aws/template.yml" in lines(template_step),
        "cfn-lint step is not executable")

contract_step = next((step for step in steps if step.get("name") == "Run AWS deployment contract tests"), None)
require(contract_step is not None, "AWS contract test step is missing")
contract_run = contract_step.get("run", "")
contract_lines = lines(contract_step)
require_lines(contract_step, [
    "for test in infrastructure/aws/tests/*.test.sh; do",
    'echo "::group::Running AWS deployment contract test: $test"',
    'if bash "$test"; then',
    'status=$?',
    'echo "::error title=AWS contract test failed::$test exited with status $status"',
    'exit "$status"',
], "AWS contract test step")
group_start = contract_lines.index('echo "::group::Running AWS deployment contract test: $test"')
if_index = contract_lines.index('if bash "$test"; then')
success_close = contract_lines.index('echo "::endgroup::"', if_index)
else_index = contract_lines.index("else", success_close)
status_index = contract_lines.index('status=$?', else_index)
error_index = contract_lines.index(
    'echo "::error title=AWS contract test failed::$test exited with status $status"', else_index)
failure_close = contract_lines.index('echo "::endgroup::"', else_index)
exit_index = contract_lines.index('exit "$status"', else_index)
require(group_start < if_index < success_close < else_index,
        "AWS contract test name and success group must precede failure branch")
require(status_index == else_index + 1 and status_index < error_index < failure_close < exit_index,
        "AWS contract test must capture failure status before reporting, close group, then exit")
require(contract_run.count('echo "::endgroup::"') == 2,
        "AWS contract test groups must close on success and failure")
for test_name in (
    "secret-scan.test.sh",
    "migration-data.test.sh",
    "migration-data-contract.test.sh",
    "production-compose.test.sh",
    "template.test.sh",
    "ci-contract.test.sh",
):
    require((root / "infrastructure/aws/tests" / test_name).is_file(),
            f"required AWS contract test is missing: {test_name}")

for name, expected_image in (
    ("Scan Caddy base image", "caddy:2.11.4@sha256:040e9f7480b80b6d4a7e5013a21159b950a63dcbdb956e38abe2387fb28d9ec0"),
    ("Scan Kong base image", "kong:3.9.3@sha256:d56dba2a916b7bb842ec0b5caae3e0956b18afc10119ea90203a41650c01f7c9"),
):
    step = next((step for step in steps if step.get("name") == name), None)
    require(step is not None and step.get("uses") == trivy_ref,
            f"Trivy scan step is missing: {name}")
    config = step.get("with", {})
    require(config.get("image-ref") == expected_image, f"Trivy image is not pinned: {name}")
    require(config.get("severity") == "CRITICAL" and config.get("ignore-unfixed") is True
            and str(config.get("exit-code")) == "1", f"Trivy critical gate is incomplete: {name}")

frontend_steps = jobs.get("frontend", {}).get("steps", [])
require(any("docker compose -f infrastructure/docker-compose.yml up -d --build --wait kong"
            in lines(step) for step in frontend_steps),
        "local development Compose setup is missing")

publish_job = publish.get("jobs", {}).get("build-and-push", {})
require(publish_job.get("permissions") == {"contents": "read"},
        "Docker publish job must keep read-only repository permissions")
publish_steps = publish_job.get("steps", [])
meta_index = next((index for index, step in enumerate(publish_steps) if step.get("id") == "meta"), None)
build_index = next((index for index, step in enumerate(publish_steps)
                    if step.get("uses", "").startswith("docker/build-push-action@")), None)
scan_index = next((index for index, step in enumerate(publish_steps)
                   if step.get("uses", "").startswith("aquasecurity/trivy-action@")), None)
require(meta_index is not None and build_index is not None and scan_index is not None
        and meta_index < build_index < scan_index,
        "Docker publish must prepare tags, push image, then scan image")

meta = publish_steps[meta_index]
require_lines(meta, [
    'SHA_TAG="sha-${GITHUB_SHA::12}"',
    'VERSION="${GITHUB_REF_NAME#v}"',
    'echo "$IMAGE:$SHA_TAG"',
    'echo "$IMAGE:$VERSION"',
    'echo "$IMAGE:latest"',
    'echo "sha_tag=$SHA_TAG"',
    '} >> "$GITHUB_OUTPUT"',
], "Docker publish SHA tag preparation")
meta_lines = lines(meta)
require(meta_lines.index('echo "tags<<EOF"') < meta_lines.index('echo "$IMAGE:$SHA_TAG"')
        < meta_lines.index('if [ "$VERSION" != "$SHA_TAG" ]; then'),
        "SHA tag must be emitted unconditionally for release and branch builds")
build = publish_steps[build_index]
require(build.get("with", {}).get("push") is True
        and build.get("with", {}).get("tags") == "${{ steps.meta.outputs.tags }}",
        "Docker publish must push all prepared tags")
scan = publish_steps[scan_index]
scan_config = scan.get("with", {})
require(scan_config.get("image-ref") == "${{ env.DOCKER_IMAGE_PREFIX }}-${{ matrix.service }}:${{ steps.meta.outputs.sha_tag }}",
        "Trivy must scan the immutable SHA image tag")
require(scan_config.get("severity") == "CRITICAL" and scan_config.get("ignore-unfixed") is True
        and str(scan_config.get("exit-code")) == "1",
        "Docker publish Trivy critical gate is incomplete")

print("CI deployment validation contract: PASS")
PY
