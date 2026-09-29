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
read_stack
app_secret_arn=$(stack_output AppSecretArn) || die "stack does not export AppSecretArn"
aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$app_secret_arn" \
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
login_admin
fetch_csrf "$temp_dir/adopter.cookies"
jq '{firstName:.prefix,lastName:"Adopter",email:.adopter.email,telephone:"07000000000",password:.adopter.password}' \
    "$fixture_file" >"$temp_dir/payload.json"
request POST /api/auth/signup "$temp_dir/adopter.cookies" "$temp_dir/payload.json" || die "adopter signup failed"
# shellcheck disable=SC2016
journal --slurpfile response "$temp_dir/response.json" '.adopter += {accountId:$response[0].user.accountId,profileId:$response[0].user.profileId}'
jq -e '.adopter | .accountId != null and .profileId != null' "$fixture_file" >/dev/null || die "signup returned no fixture IDs"
fetch_csrf "$temp_dir/admin.cookies"
jq '{name:(.prefix+" Staff"),email:.staff.email,password:.staff.password,role:"STAFF",telephone:"07000000000"}' \
    "$fixture_file" >"$temp_dir/payload.json"
request POST /api/admin/staff "$temp_dir/admin.cookies" "$temp_dir/payload.json" || die "staff provisioning failed"
# shellcheck disable=SC2016
journal --slurpfile response "$temp_dir/response.json" '.staff += {accountId:$response[0].accountId,profileId:$response[0].profileId}'
jq -e '.staff | .accountId != null and .profileId != null' "$fixture_file" >/dev/null || die "staff provisioning returned no fixture IDs"
for index in 1 2 3; do
    fetch_csrf "$temp_dir/admin.cookies"
    jq --arg index "$index" '{name:(.prefix+"-animal-"+$index),animalType:"Dog",breed:"Mixed",gender:"UNKNOWN",size:"MEDIUM",status:"AVAILABLE",temperament:"Friendly",description:"Load test fixture"}' \
        "$fixture_file" >"$temp_dir/payload.json"
    request POST /api/animals/create "$temp_dir/admin.cookies" "$temp_dir/payload.json" || die "animal creation failed"
    # shellcheck disable=SC2016
    journal --slurpfile response "$temp_dir/response.json" '.animalIds += [$response[0].id]'
    jq -e '.animalIds | all(type == "string" and length > 0)' "$fixture_file" >/dev/null || die "animal creation returned no ID"
done
echo "fixtures created: 5"
