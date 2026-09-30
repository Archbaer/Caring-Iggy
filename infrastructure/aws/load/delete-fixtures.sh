#!/usr/bin/env bash
set +x
set -euo pipefail
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
# shellcheck source=common.sh
source "$script_dir/common.sh"
require_environment
# BASE_URL is validated by require_environment in common.sh.
# shellcheck disable=SC2153
base_url=${BASE_URL%/}
fixture_file=${1:-${K6_FIXTURE_FILE:-}}
[[ -f $fixture_file && ! -L $fixture_file ]] || die "fixture file is required and must not be a symlink"
temp_dir=$(mktemp -d)
cleanup() {
    local status=$?
    trap - EXIT
    trap '' INT TERM
    if ! logout_admin; then
        echo "admin session logout failed" >&2
        ((status != 0)) || status=1
    fi
    rm -rf "$temp_dir"
    exit "$status"
}
trap cleanup EXIT
trap 'signal_exit 130' INT
trap 'signal_exit 143' TERM
read_stack
export LOAD_BASE_URL=$base_url LOAD_STACK_NAME=$STACK_NAME
jq -e --slurpfile stack "$temp_dir/stack.json" '
    .baseUrl == env.LOAD_BASE_URL and .stackName == env.LOAD_STACK_NAME and .stackId == $stack[0].Stacks[0].StackId and
    (.prefix | test("^load-[0-9]+-[0-9a-f]{16}$")) and
    .adopter.email == (.prefix+"-adopter@example.org") and .staff.email == (.prefix+"-staff@example.org") and
    ([.adopter.accountId,.adopter.profileId,.staff.accountId,.staff.profileId] |
      all(. == null or (type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")))) and
    (.animalIds | all(type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")))
' "$fixture_file" >/dev/null || die "fixture identity or stack does not match"
login_admin
failed=0 count=0
while IFS= read -r animal_id; do
    fetch_csrf "$temp_dir/admin.cookies"
    if request DELETE "/api/animals/$animal_id/delete" "$temp_dir/admin.cookies"; then
        count=$((count + 1))
    else
        failed=1
    fi
done < <(jq -r '.animalIds[]' "$fixture_file")
staff_profile=$(jq -r '.staff.profileId // empty' "$fixture_file")
if [[ -n $staff_profile ]]; then
    fetch_csrf "$temp_dir/admin.cookies"
    if request DELETE "/api/admin/staff/$staff_profile" "$temp_dir/admin.cookies"; then
        count=$((count + 1))
    else
        failed=1
    fi
fi
# The BFF has no adopter deletion API; staff DELETE leaves its auth account.
# Recheck the tag immediately before narrowly scoped account/profile SQL.
read_stack
jq -e --slurpfile stack "$temp_dir/stack.json" '.stackId == $stack[0].Stacks[0].StackId' \
    "$fixture_file" >/dev/null || die "stack changed during cleanup; fixture journal retained"
instance_id=$(stack_output InstanceId) || die "stack does not export InstanceId"
db_host=$(stack_output RdsEndpoint) || die "stack does not export RdsEndpoint"
[[ $instance_id =~ ^i-[0-9a-f]+$ && $db_host =~ ^[A-Za-z0-9.-]+$ ]] || die "invalid stack cleanup outputs"
{
    printf "bash -s <<'CI_LOAD_FIXTURE_CLEANUP'\n"
    printf 'exec >/dev/null 2>&1\nexport CI_LOAD_TEST=true LOAD_STACK_PURPOSE=disposable\n'
    printf 'LOAD_DB_HOST=%q\n' "$db_host"
    for entry in 'LOAD_PREFIX prefix' 'LOAD_ADOPTER_EMAIL adopter.email' 'LOAD_STAFF_EMAIL staff.email' \
        'LOAD_ADOPTER_ACCOUNT adopter.accountId' 'LOAD_ADOPTER_PROFILE adopter.profileId' \
        'LOAD_STAFF_ACCOUNT staff.accountId' 'LOAD_STAFF_PROFILE staff.profileId'; do
        name=${entry%% *} field=${entry#* }
        printf '%s=%q\n' "$name" "$(jq -r ".$field // empty" "$fixture_file")"
    done
    sed '1d' "$script_dir/cleanup-accounts.sh"
    printf '\nCI_LOAD_FIXTURE_CLEANUP\n'
} >"$temp_dir/remote.sh"
jq -Rs '{commands:[.]}' "$temp_dir/remote.sh" >"$temp_dir/parameters.json"
run_cancellable aws ssm send-command --region "$AWS_REGION" --instance-ids "$instance_id" \
    --document-name AWS-RunShellScript --parameters "file://$temp_dir/parameters.json" \
    --output json >"$temp_dir/command.json" 2>/dev/null || die "could not start account cleanup"
command_id=$(jq -er '.Command.CommandId' "$temp_dir/command.json") || die "missing cleanup command ID"
status=Pending
for ((attempt = 0; attempt < 120; attempt++)); do
    if run_cancellable aws ssm get-command-invocation --region "$AWS_REGION" --command-id "$command_id" \
        --instance-id "$instance_id" --output json >"$temp_dir/invocation.json" 2>/dev/null; then
        status=$(jq -r '.Status' "$temp_dir/invocation.json")
        case $status in
            Success) break ;;
            Pending|InProgress|Delayed) ;;
            *) die "account cleanup failed; fixture journal retained" ;;
        esac
    fi
    sleep 2
done
[[ $status == Success ]] || die "account cleanup timed out; fixture journal retained"
((failed == 0)) || die "API cleanup failed; fixture journal retained"
logout_admin || die "admin session logout failed; fixture journal retained"
jq -e '.pendingMutation == null' "$fixture_file" >/dev/null || die "ambiguous fixture creation; pending mutation journal retained for recovery"
rm -f "$fixture_file"
echo "fixtures deleted: $((count + 1))"
