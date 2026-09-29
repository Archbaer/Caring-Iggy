#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
subject="$repo_root/infrastructure/aws/disposable-verification.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT
mkdir -p "$fixture_dir/bin" "$fixture_dir/host" "$fixture_dir/config"
export TEST_ROOT="$fixture_dir"
export PATH="$fixture_dir/bin:$PATH"

# Execute the real verifier and remote health shell; replace only external
# boundaries. Wrong safety branches, absent containers, and stale boot state
# must fail, rather than merely changing captured source text.
cat >"$fixture_dir/bin/aws" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$TEST_ROOT/aws.log"
[[ $1 != --version ]] || { echo 'aws-cli/2.31.0'; exit; }
service=$1 operation=$2
shift 2
args=("$@")
value() {
  local i
  for ((i=0; i<${#args[@]}; i++)); do
    if [[ ${args[$i]} == "$1" ]]; then printf '%s' "${args[$((i+1))]}"; return; fi
  done
}
case "$service:$operation" in
  sts:get-caller-identity) echo 123456789012 ;;
  cloudformation:describe-stacks)
    jq -n --arg purpose "${SCENARIO_PURPOSE:-disposable}" '{Stacks:[{
      StackId:"arn:aws:cloudformation:eu-west-2:123456789012:stack/caring-iggy-disposable/abc",
      StackStatus:"UPDATE_COMPLETE",Tags:[{Key:"Purpose",Value:$purpose}],Outputs:[
      {OutputKey:"InstanceId",OutputValue:"i-0123456789abcdef0"},
      {OutputKey:"ElasticIp",OutputValue:"192.0.2.10"},
      {OutputKey:"RdsEndpoint",OutputValue:"db.example.internal"},
      {OutputKey:"AppSecretArn",OutputValue:"arn:aws:secretsmanager:eu-west-2:123456789012:secret:app"},
      {OutputKey:"RdsSecretArn",OutputValue:"arn:aws:secretsmanager:eu-west-2:123456789012:secret:rds"},
      {OutputKey:"ArtifactBucketName",OutputValue:"caring-iggy-disposable-artifacts"}]}]}' ;;
  ec2:describe-instances) echo "${SCENARIO_INSTANCE:-t3.medium}" ;;
  rds:describe-db-instances)
    if [[ -n $(value --db-instance-identifier) ]]; then echo restore.example.internal
    else
      jq -n --argjson protected "${SCENARIO_PROTECTED:-true}" --arg class "${SCENARIO_RDS_CLASS:-db.t4g.small}" '[{
        DBInstanceIdentifier:"caring-iggy-disposable-db",DBInstanceClass:$class,
        Endpoint:{Address:"db.example.internal"},AllocatedStorage:20,DeletionProtection:$protected,
        VpcSecurityGroups:[{VpcSecurityGroupId:"sg-0123456789abcdef0"}],
        DBSubnetGroup:{DBSubnetGroupName:"caring-iggy-db-subnet"},
        LatestRestorableTime:"2026-09-28T10:00:00Z"}]'
    fi ;;
  ssm:describe-instance-information)
    if [[ -f "$TEST_ROOT/reboot" ]]; then
      count=$(<"$TEST_ROOT/pings")
      count=$((count+1)); printf '%s' "$count" >"$TEST_ROOT/pings"
      if [[ ${SCENARIO_REBOOT:-normal} == no-transition || $count == 1 || $count -ge 3 ]]; then echo Online
      else echo ConnectionLost; fi
    else echo Online; fi ;;
  ssm:send-command)
    command=$(value --parameters | jq -r '.commands[0]')
    id=$(($(<"$TEST_ROOT/count")+1)); printf '%s' "$id" >"$TEST_ROOT/count"
    printf '%s' "$command" >"$TEST_ROOT/command-$id"
    [[ $command != *'shutdown -r'* ]] || touch "$TEST_ROOT/reboot"
    jq -n --arg id "command-$id" '{Command:{CommandId:$id}}' ;;
  ssm:get-command-invocation)
    id=$(value --command-id); command=$(<"$TEST_ROOT/$id")
    status=Success output='ok' error=''
    case "$command" in
      *'shutdown -r'*) touch "$TEST_ROOT/reboot"; status=Failed; error='SSM disconnected during reboot' ;;
      *'/proc/sys/kernel/random/boot_id'*)
        output=11111111-1111-1111-1111-111111111111
        if [[ -f "$TEST_ROOT/reboot" && $(<"$TEST_ROOT/pings") -ge 3 && ${SCENARIO_REBOOT:-normal} != same-marker ]]; then
          output=22222222-2222-2222-2222-222222222222
        fi ;;
      *'docker inspect'*|*'init-databases.sh'*)
        command=${command//\/opt\/caring-iggy/$TEST_ROOT\/host}
        command=${command//\/etc\/caring-iggy/$TEST_ROOT\/config}
        if ! output=$(bash -c "$command" 2>"$TEST_ROOT/remote-error"); then status=Failed; error=$(<"$TEST_ROOT/remote-error"); fi ;;
      *'release sha-000000000000'*) status=Failed; error='bad image' ;;
      *'deploy-on-host.sh rollback'*) [[ ${SCENARIO_ROLLBACK:-ok} == ok ]] || status=Failed ;;
      *'restore.example.internal'*) [[ ${SCENARIO_PITR_VERIFY:-ok} == ok ]] || status=Failed ;;
      *) echo "unexpected remote command: $command" >&2; exit 2 ;;
    esac
    jq -n --arg status "$status" --arg output "$output" --arg error "$error" '{Status:$status,StandardOutputContent:$output,StandardErrorContent:$error}' ;;
  rds:restore-db-instance-to-point-in-time)
    [[ " $* " == *' --use-latest-restorable-time '* ]] || { echo 'restore time exceeds latest restorable time' >&2; exit 1; }
    [[ $(value --source-db-instance-identifier) == caring-iggy-disposable-db ]] || exit 1
    [[ $(value --target-db-instance-identifier) != caring-iggy-disposable-db ]] || exit 1
    [[ " $* " == *' --no-publicly-accessible '* && " $* " == *' --deletion-protection '* ]] || exit 1
    [[ $(value --db-subnet-group-name) == caring-iggy-db-subnet ]] || exit 1
    [[ ${SCENARIO_RESTORE:-ok} == ok ]] || exit 1
    touch "$TEST_ROOT/restored"; echo '{}' ;;
  rds:wait) [[ -f "$TEST_ROOT/restored" ]] || exit 1 ;;
  *) echo "unexpected AWS call: $service:$operation" >&2; exit 2 ;;
esac
STUB
cat >"$fixture_dir/bin/docker" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$TEST_ROOT/docker.log"
if [[ $1 == compose ]]; then
  [[ ${IMAGE_TAG:-} == sha-0123456789ab ]] || { echo 'IMAGE_TAG not loaded' >&2; exit 1; }
  service=${!#}
  [[ ${SCENARIO_HEALTH:-ok} != missing || $service != frontend ]] || exit 0
  printf 'container-%s\n' "$service"
elif [[ $1 == inspect ]]; then
  if [[ ${SCENARIO_HEALTH:-ok} == unhealthy && ${!#} == container-frontend ]]; then echo 'true unhealthy false'
  elif [[ ${SCENARIO_HEALTH:-ok} == oom && ${!#} == container-frontend ]]; then echo 'true healthy true'
  else echo 'true healthy false'; fi
else exit 2; fi
STUB
cat >"$fixture_dir/bin/nc" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "${!#}" >>"$TEST_ROOT/ports.log"
case ${!#} in 80|443) exit 0 ;; *) [[ ${SCENARIO_PORT:-closed} == "${!#}" ]] ;; esac
STUB
cat >"$fixture_dir/bin/curl" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$TEST_ROOT/curl.log"
[[ ${SCENARIO_TLS:-ok} != invalid ]] || exit 60
if [[ $* == *http://192.0.2.10/* ]]; then
  [[ ${SCENARIO_REDIRECT:-ok} != invalid ]] || { printf 'HTTP/1.1 200 OK\n'; exit; }
  printf 'HTTP/1.1 308 Permanent Redirect\nLocation: https://192.0.2.10/\n\n'
fi
STUB
cat >"$fixture_dir/bin/openssl" <<'STUB'
#!/usr/bin/env bash
case "$*" in
  s_client*) printf 'certificate\n' ;;
  *-checkend*) [[ ${SCENARIO_EXPIRY:-ok} == ok ]] ;;
  *-serial*) echo 'serial=ABCDEF1234' ;;
  *-issuer*) echo 'issuer=CN = Lets Encrypt' ;;
  *-enddate*) echo 'notAfter=Oct 7 10:00:00 2026 GMT' ;;
  *) exit 2 ;;
esac
STUB
cat >"$fixture_dir/bin/sleep" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
cat >"$fixture_dir/host/init-databases.sh" <<'STUB'
#!/usr/bin/env bash
set -eu
[[ ${AWS_REGION:-} == eu-west-2 && ${RDS_ENDPOINT:-} == db.example.internal ]] || exit 1
[[ ${SCENARIO_DATABASE:-ok} == ok ]] || exit 1
echo role-isolation-verified
STUB
printf 'AWS_REGION=eu-west-2\nRDS_ENDPOINT=db.example.internal\n' >"$fixture_dir/config/deployment.env"
printf 'sha-0123456789ab\n' >"$fixture_dir/config/current-image-tag"
chmod +x "$fixture_dir/bin/"* "$fixture_dir/host/init-databases.sh"

reset() {
  rm -f "$fixture_dir/reboot" "$fixture_dir/restored" "$fixture_dir/"command-*
  printf '0' >"$fixture_dir/count"; printf '0' >"$fixture_dir/pings"
  : >"$fixture_dir/aws.log"; : >"$fixture_dir/docker.log"; : >"$fixture_dir/ports.log"; : >"$fixture_dir/curl.log"
}
run() {
  bash "$subject" --stack-name caring-iggy-disposable --budget-ceiling-usd 100 "$@" >"$fixture_dir/output.log" 2>&1
}
assert_safe() {
  if grep -Eq 'cloudformation (delete-stack|update-stack)|rds (delete-db-instance|modify-db-instance)|ec2 terminate-instances|s3 (rb|rm)' "$fixture_dir/aws.log"; then
    echo 'verifier deleted resources or changed source protection' >&2; exit 1
  fi
}
reject() {
  local label=$1; shift
  reset
  if run "$@"; then echo "unsafe verification accepted: $label" >&2; exit 1; fi
  assert_safe
}

# A reboot command can disconnect SSM; stale Online and unchanged boot ID must
# not complete verification. PITR must use an AWS-restorable timestamp.
reset
if ! run; then cat "$fixture_dir/output.log" >&2; echo 'successful disconnected reboot/PITR rejected' >&2; exit 1; fi
assert_safe
[[ $(<"$fixture_dir/pings") -ge 3 ]] || { echo 'stale Online accepted after reboot' >&2; exit 1; }
for service in caddy frontend kong animal-service adopter-service user-service matching-service reporting-service; do
  grep -Fq "container-$service" "$fixture_dir/docker.log" || { echo "health not inspected: $service" >&2; exit 1; }
done
for port in 22 3000 8000 8001 8081 8082 8083 8084 8085 5432 80 443; do
  grep -qx "$port" "$fixture_dir/ports.log" || { echo "public port not checked: $port" >&2; exit 1; }
done
grep -Fq -- '--fail' "$fixture_dir/curl.log" || { echo 'trusted HTTPS curl omitted' >&2; exit 1; }
grep -Fq 'Cleanup checklist' "$fixture_dir/output.log" || { echo 'manual cleanup omitted' >&2; exit 1; }
[[ -f "$fixture_dir/restored" ]] || { echo 'PITR not requested' >&2; exit 1; }
SCENARIO_REBOOT=no-transition reject stale-online
SCENARIO_REBOOT=same-marker reject unchanged-boot-id
SCENARIO_HEALTH=missing reject absent-container
SCENARIO_HEALTH=unhealthy reject unhealthy-container
SCENARIO_HEALTH=oom reject oom-container
SCENARIO_DATABASE=failed reject database-isolation
SCENARIO_ROLLBACK=failed reject rollback-failure
SCENARIO_PITR_VERIFY=failed reject restored-db-unreachable
SCENARIO_RESTORE=failed reject restore-failure
SCENARIO_TLS=invalid reject untrusted-or-wrong-host-TLS
SCENARIO_EXPIRY=invalid reject expiring-certificate
SCENARIO_REDIRECT=invalid reject missing-redirect
SCENARIO_PORT=8001 reject exposed-admin-port
SCENARIO_PURPOSE=production reject production-stack
! grep -q 'ssm send-command\|rds restore-' "$fixture_dir/aws.log" || { echo 'production stack mutated' >&2; exit 1; }
SCENARIO_PROTECTED=false reject source-protection-disabled
SCENARIO_INSTANCE=m7i.4xlarge reject unsupported-EC2-cost
SCENARIO_RDS_CLASS=db.m7g.4xlarge reject unsupported-RDS-cost
reject wrong-region --region us-east-1
reject zero-budget --budget-ceiling-usd 0
reject low-budget --budget-ceiling-usd 1
reject unchanged-certificate --previous-certificate-serial ABCDEF1234
reset
run --previous-certificate-serial 12345678 || { cat "$fixture_dir/output.log" >&2; exit 1; }
assert_safe
echo 'disposable verification contract: PASS (reboot, health, TLS, PITR, safety, renewal)'
