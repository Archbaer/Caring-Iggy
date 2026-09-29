#!/usr/bin/env bash
set -euo pipefail

umask 077

if [[ ${CI_LOAD_TEST:-} != true ]]; then
    echo "CI_LOAD_TEST must be set to true" >&2
    exit 1
fi

if [[ -z ${BASE_URL:-} ]]; then
    echo "BASE_URL is required" >&2
    exit 1
fi

if [[ ${BASE_URL} != https://* ]]; then
    echo "BASE_URL must use HTTPS" >&2
    exit 1
fi

if [[ -z ${STACK_NAME:-} ]]; then
    echo "STACK_NAME is required" >&2
    exit 1
fi

: "${AWS_REGION:?AWS_REGION is required}"

for command in aws curl jq; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "required command is unavailable: $command" >&2
        exit 1
    fi
done

base_url=${BASE_URL%/}
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
chmod 700 "$temp_dir"

secret_file="$temp_dir/app-secret.json"
fixture_file="$temp_dir/fixtures.json"

die() {
    echo "fixture error: $1" >&2
    exit 1
}

# shellcheck disable=SC2016
stack_purpose=$(aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Tags[?Key==`Purpose`].Value | [0]' \
    --output text 2>/dev/null || echo "")

if [[ $stack_purpose != disposable ]]; then
    die "stack $STACK_NAME is not tagged Purpose=disposable"
fi

# shellcheck disable=SC2016
app_secret_arn=$(aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`AppSecretArn`].OutputValue | [0]' \
    --output text)

if [[ -z $app_secret_arn || $app_secret_arn == None ]]; then
    die "stack $STACK_NAME does not export AppSecretArn"
fi

aws secretsmanager get-secret-value \
    --region "$AWS_REGION" \
    --secret-id "$app_secret_arn" \
    --query SecretString \
    --output text >"$secret_file"
chmod 600 "$secret_file"

admin_email=$(jq -r '.initialAdmin.email' "$secret_file")
admin_password=$(jq -r '.initialAdmin.passwordHex' "$secret_file")

if [[ -z $admin_email || $admin_email == null || -z $admin_password || $admin_password == null ]]; then
    die "application secret is missing initialAdmin credentials"
fi



csrf_token=""
csrf_cookie=""

fetch_csrf() {
    local body
    body=$(curl -fsS -D - "$base_url/api/auth/session" 2>/dev/null | tr -d '\r')
    csrf_cookie=$(printf '%s\n' "$body" | awk -F';' '/^[Ss]et-[Cc]ookie: *ci_csrf=/{print $1; exit}' | sed 's/^[Ss]et-[Cc]ookie: *//')
    csrf_token=$(printf '%s\n' "$body" | awk '/^\r?$/{start=1; next} start{print}' | jq -r '.csrfToken')
}

login() {
    local email=$1 password=$2
    local response
    response=$(curl -fsS -D - -X POST \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf_token" \
        -b "$csrf_cookie" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        "$base_url/api/auth/login" 2>/dev/null | tr -d '\r')
    printf '%s\n' "$response" | awk '/^\r?$/{start=1; next} start{print}' | jq -r '.csrfToken'
}

extract_cookie_value() {
    local cookie=$1 name=$2
    printf '%s' "$cookie" | awk -v "n=$name" -F'=' '$1==n{print $2}'
}

fetch_csrf
admin_session_cookie=$(curl -fsS -D - -X POST \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $csrf_token" \
    -b "$csrf_cookie" \
    -d "{\"email\":\"$admin_email\",\"password\":\"$admin_password\"}" \
    "$base_url/api/auth/login" 2>/dev/null | tr -d '\r' | awk -F';' '/^[Ss]et-[Cc]ookie: *ci_session=/{print $1; exit}' | sed 's/^[Ss]et-[Cc]ookie: *//')

if [[ -z $admin_session_cookie ]]; then
    die "admin login failed"
fi

admin_session_value=$(extract_cookie_value "$admin_session_cookie" ci_session)

prefix="load-$(date +%s)-$$"
fixture_count=0

# Create adopter account via public signup.
adopter_email="${prefix}-adopter@example.org"
adopter_password=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-24)
adopter_first="Load${RANDOM}"
adopter_last="Adopter${RANDOM}"
adopter_telephone="07$(printf '%.0s' {1..9})"

fetch_csrf
adopter_response=$(curl -fsS -X POST \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $csrf_token" \
    -b "$csrf_cookie" \
    -d "{\"firstName\":\"$adopter_first\",\"lastName\":\"$adopter_last\",\"email\":\"$adopter_email\",\"telephone\":\"$adopter_telephone\",\"password\":\"$adopter_password\"}" \
    "$base_url/api/auth/signup" 2>/dev/null)
adopter_account_id=$(printf '%s\n' "$adopter_response" | jq -r '.user.accountId // .user.id')
adopter_profile_id=$(printf '%s\n' "$adopter_response" | jq -r '.user.profileId // empty')

if [[ -z $adopter_account_id || $adopter_account_id == null ]]; then
    die "adopter signup did not return an account id"
fi

fixture_count=$((fixture_count + 1))

# Create staff account via admin provision.
staff_email="${prefix}-staff@example.org"
staff_password=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-24)
staff_name="Load Staff ${RANDOM}"

fetch_csrf
staff_response=$(curl -fsS -X POST \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $csrf_token" \
    -b "ci_session=$admin_session_value; $csrf_cookie" \
    -d "{\"name\":\"$staff_name\",\"email\":\"$staff_email\",\"password\":\"$staff_password\",\"role\":\"STAFF\",\"telephone\":\"$adopter_telephone\"}" \
    "$base_url/api/admin/staff" 2>/dev/null)
staff_profile_id=$(printf '%s\n' "$staff_response" | jq -r '.profileId // .accountId // .user.profileId // .user.accountId // empty')

if [[ -z $staff_profile_id || $staff_profile_id == null ]]; then
    die "staff provisioning did not return a profile id"
fi

fixture_count=$((fixture_count + 1))

# Create representative animals via staff/animal editor endpoint.
animal_ids=()
for index in 1 2 3; do
    animal_name="${prefix}-animal-${index}-${RANDOM}"
    fetch_csrf
    animal_response=$(curl -fsS -X POST \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf_token" \
        -b "ci_session=$admin_session_value; $csrf_cookie" \
        -d "{\"name\":\"$animal_name\",\"animalType\":\"Dog\",\"breed\":\"Mixed\",\"gender\":\"UNKNOWN\",\"size\":\"MEDIUM\",\"status\":\"AVAILABLE\",\"temperament\":\"Friendly\",\"description\":\"Load test fixture\"}" \
        "$base_url/api/animals/create" 2>/dev/null)
    animal_id=$(printf '%s\n' "$animal_response" | jq -r '.id // empty')
    if [[ -n $animal_id && $animal_id != null ]]; then
        animal_ids+=("$animal_id")
        fixture_count=$((fixture_count + 1))
    fi
done

jq -n \
    --arg prefix "$prefix" \
    --arg admin_email "$admin_email" \
    --arg admin_password "$admin_password" \
    --arg adopter_email "$adopter_email" \
    --arg adopter_password "$adopter_password" \
    --arg adopter_account_id "$adopter_account_id" \
    --arg adopter_profile_id "$adopter_profile_id" \
    --arg staff_email "$staff_email" \
    --arg staff_password "$staff_password" \
    --arg staff_profile_id "$staff_profile_id" \
    --argjson animal_ids "$(printf '%s\n' "${animal_ids[@]:-}" | jq -R . | jq -s .)" \
    '{
        prefix: $prefix,
        admin: { email: $admin_email, password: $admin_password },
        adopter: { email: $adopter_email, password: $adopter_password, accountId: $adopter_account_id, profileId: $adopter_profile_id },
        staff: { email: $staff_email, password: $staff_password, profileId: $staff_profile_id },
        animalIds: $animal_ids
    }' >"$fixture_file"

chmod 600 "$fixture_file"
fixture_path="${K6_FIXTURE_FILE:-$temp_dir/load-fixtures.json}"
parent_dir=$(dirname "$fixture_path")
mkdir -p "$parent_dir"
mv -f "$fixture_file" "$fixture_path"
chmod 600 "$fixture_path"

echo "fixtures created: $fixture_count"
