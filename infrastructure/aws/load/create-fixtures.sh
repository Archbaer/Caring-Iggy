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
[[ -n ${K6_FIXTURE_FILE:-} ]] || die "K6_FIXTURE_FILE is required"
fixture_file=$K6_FIXTURE_FILE
[[ ! -s $fixture_file && ! -L $fixture_file ]] || die "fixture file must be empty and not a symlink"
: >"$fixture_file"
chmod 600 "$fixture_file"
temp_dir=$(mktemp -d)
cleanup() {
    local status=$?
    trap - EXIT
    trap '' INT TERM
    if ! logout_admin; then
        echo "admin session logout failed" >&2
        ((status != 0)) || status=1
    fi
    if ((status != 0)) && [[ -s $fixture_file ]]; then
        bash "$script_dir/delete-fixtures.sh" >/dev/null || echo "fixture cleanup failed; retain fixture journal for retry" >&2
    fi
    rm -rf "$temp_dir"
    exit "$status"
}
trap cleanup EXIT
trap 'signal_exit 130' INT
trap 'signal_exit 143' TERM
read_stack
app_secret_arn=$(stack_output AppSecretArn) || die "stack does not export AppSecretArn"
run_cancellable aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$app_secret_arn" \
    --query SecretString --output text >"$temp_dir/secret.json" 2>/dev/null || die "cannot read application secret"
jq -e '.initialAdmin | (.email | type == "string" and length > 0) and (.passwordHex | type == "string" and length > 0)' \
    "$temp_dir/secret.json" >/dev/null || die "invalid initial-admin credentials"
export LOAD_PREFIX LOAD_ADOPTER_PASSWORD LOAD_STAFF_PASSWORD LOAD_BASE_URL LOAD_STACK_NAME
LOAD_PREFIX="load-$(date +%s)-$(openssl rand -hex 8)"
LOAD_ADOPTER_PASSWORD=$(openssl rand -hex 24)
LOAD_STAFF_PASSWORD=$(openssl rand -hex 24)
LOAD_BASE_URL=$base_url LOAD_STACK_NAME=$STACK_NAME
jq --slurpfile stack "$temp_dir/stack.json" '{
    prefix:env.LOAD_PREFIX, baseUrl:env.LOAD_BASE_URL, stackName:env.LOAD_STACK_NAME,
    stackId:$stack[0].Stacks[0].StackId,
    admin:{email:.initialAdmin.email,password:.initialAdmin.passwordHex},
    adopter:{email:(env.LOAD_PREFIX+"-adopter@example.org"),password:env.LOAD_ADOPTER_PASSWORD},
    staff:{email:(env.LOAD_PREFIX+"-staff@example.org"),password:env.LOAD_STAFF_PASSWORD},animalIds:[]
}' "$temp_dir/secret.json" >"$fixture_file"
chmod 600 "$fixture_file"
unset LOAD_ADOPTER_PASSWORD LOAD_STAFF_PASSWORD
create_record() {
    local endpoint=$1 jar=$2
    # Save non-secret recovery identity before the server can commit the mutation.
    # shellcheck disable=SC2016
    journal --arg endpoint "$endpoint" --slurpfile payload "$temp_dir/payload.json" \
        '.pendingMutation = {endpoint:$endpoint,identity:($payload[0].name // $payload[0].email)}'
    if ! request POST "$endpoint" "$jar" "$temp_dir/payload.json"; then
        # Only explicit application rejection resolves the pending mutation.
        case ${request_status:-transport} in
            400|401|403|404|409|422) journal 'del(.pendingMutation)' ;;
        esac
        die "fixture creation failed"
    fi
}
login_admin
fetch_csrf "$temp_dir/adopter.cookies"
jq '{firstName:.prefix,lastName:"Adopter",email:.adopter.email,telephone:"07000000000",password:.adopter.password}' \
    "$fixture_file" >"$temp_dir/payload.json"
create_record /api/auth/signup "$temp_dir/adopter.cookies"
jq -e '[.user.accountId,.user.profileId] | all(type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"))' \
    "$temp_dir/response.json" >/dev/null || die "signup returned no valid fixture IDs"
# shellcheck disable=SC2016
journal --slurpfile response "$temp_dir/response.json" '.adopter += {accountId:$response[0].user.accountId,profileId:$response[0].user.profileId} | del(.pendingMutation)'
fetch_csrf "$temp_dir/admin.cookies"
jq '{name:(.prefix+" Staff"),email:.staff.email,password:.staff.password,role:"STAFF",telephone:"07000000000"}' \
    "$fixture_file" >"$temp_dir/payload.json"
create_record /api/admin/staff "$temp_dir/admin.cookies"
jq -e '[.accountId,.profileId] | all(type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"))' \
    "$temp_dir/response.json" >/dev/null || die "staff provisioning returned no valid fixture IDs"
# shellcheck disable=SC2016
journal --slurpfile response "$temp_dir/response.json" '.staff += {accountId:$response[0].accountId,profileId:$response[0].profileId} | del(.pendingMutation)'
for index in 1 2 3; do
    fetch_csrf "$temp_dir/admin.cookies"
    jq --arg index "$index" '{name:(.prefix+"-animal-"+$index),animalType:"Dog",breed:"Mixed",gender:"UNKNOWN",size:"MEDIUM",status:"AVAILABLE",temperament:"Friendly",description:"Load test fixture"}' \
        "$fixture_file" >"$temp_dir/payload.json"
    create_record /api/animals/create "$temp_dir/admin.cookies"
    jq -e '.id | type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")' \
        "$temp_dir/response.json" >/dev/null || die "animal creation returned no valid ID"
    # shellcheck disable=SC2016
    journal --slurpfile response "$temp_dir/response.json" '.animalIds += [$response[0].id] | del(.pendingMutation)'
done
echo "fixtures created: 5"
