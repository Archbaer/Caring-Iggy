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

fixture_file=${1:-}
if [[ -z $fixture_file ]]; then
    fixture_file=${K6_FIXTURE_FILE:-}
fi
if [[ -z $fixture_file || ! -f $fixture_file ]]; then
    echo "fixture file is required" >&2
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

die() {
    echo "fixture cleanup error: $1" >&2
    exit 1
}

admin_email=$(jq -r '.admin.email' "$fixture_file")
admin_password=$(jq -r '.admin.password' "$fixture_file")
staff_profile_id=$(jq -r '.staff.profileId // empty' "$fixture_file")
animal_ids_json=$(jq -c '.animalIds // []' "$fixture_file")

if [[ -z $admin_email || $admin_email == null || -z $admin_password || $admin_password == null ]]; then
    die "fixture file is missing admin credentials"
fi

csrf_token=""
csrf_cookie=""

fetch_csrf() {
    local body
    body=$(curl -fsS -D - "$base_url/api/auth/session" 2>/dev/null | tr -d '\r')
    csrf_cookie=$(printf '%s\n' "$body" | awk -F';' '/^[Ss]et-[Cc]ookie: *ci_csrf=/{print $1; exit}' | sed 's/^[Ss]et-[Cc]ookie: *//')
    csrf_token=$(printf '%s\n' "$body" | awk '/^\r?$/{start=1; next} start{print}' | jq -r '.csrfToken')
}

admin_session_value=""

login_admin() {
    local response
    response=$(curl -fsS -D - -X POST \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf_token" \
        -b "$csrf_cookie" \
        -d "{\"email\":\"$admin_email\",\"password\":\"$admin_password\"}" \
        "$base_url/api/auth/login" 2>/dev/null | tr -d '\r')
    admin_session_value=$(printf '%s\n' "$response" | awk -F';' '/^[Ss]et-[Cc]ookie: *ci_session=/{print $1; exit}' | sed 's/^[Ss]et-[Cc]ookie: *ci_session=//')
}

fetch_csrf
login_admin

if [[ -z $admin_session_value ]]; then
    die "admin login failed"
fi

delete_count=0

# Delete animals created by the fixture run.
while IFS= read -r animal_id; do
    if [[ -z $animal_id || $animal_id == null ]]; then
        continue
    fi
    fetch_csrf
    if curl -fsS -X DELETE \
        -H "x-csrf-token: $csrf_token" \
        -b "ci_session=$admin_session_value; $csrf_cookie" \
        "$base_url/api/animals/$animal_id/delete" >/dev/null 2>&1; then
        delete_count=$((delete_count + 1))
    fi
done < <(jq -r '.[]' <<<"$animal_ids_json")

# Delete staff account created by the fixture run.
if [[ -n $staff_profile_id && $staff_profile_id != null ]]; then
    fetch_csrf
    if curl -fsS -X DELETE \
        -H "x-csrf-token: $csrf_token" \
        -b "ci_session=$admin_session_value; $csrf_cookie" \
        "$base_url/api/admin/staff/$staff_profile_id" >/dev/null 2>&1; then
        delete_count=$((delete_count + 1))
    fi
fi

# Adopter fixtures are intentionally left in place: the application BFF exposes
# GET+PUT on /api/admin/adopters/[id] but no DELETE, so there is no supported
# HTTP API to remove an adopter account. They are cleaned up by disposable stack
# teardown instead.

rm -f "$fixture_file"

echo "fixtures deleted: $delete_count"
