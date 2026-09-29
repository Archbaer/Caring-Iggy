#!/usr/bin/env bash
# Shared private-file transport for the disposable fixture lifecycle.
set +x
set -euo pipefail
umask 077
temp_dir=${temp_dir:-}
fixture_file=${fixture_file:-}

die() { echo "load fixture error: $1" >&2; exit 1; }
require_environment() {
    [[ ${CI_LOAD_TEST:-} == true ]] || die "CI_LOAD_TEST must be set to true"
    [[ ${BASE_URL:-} =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]] || die "BASE_URL must use HTTPS with an origin only"
    [[ -n ${STACK_NAME:-} && -n ${AWS_REGION:-} ]] || die "STACK_NAME and AWS_REGION are required"
    for command in aws curl jq openssl mktemp; do
        command -v "$command" >/dev/null 2>&1 || die "required command is unavailable: $command"
    done
    base_url=${BASE_URL%/}
}
read_stack() {
    aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name "$STACK_NAME" \
        --output json >"$temp_dir/stack.json" 2>/dev/null || die "cannot read stack"
    jq -e '.Stacks | length == 1' "$temp_dir/stack.json" >/dev/null || die "stack is unavailable"
    jq -e '.Stacks[0].Tags | any(.Key == "Purpose" and .Value == "disposable")' \
        "$temp_dir/stack.json" >/dev/null || die "stack is not tagged Purpose=disposable"
}
stack_output() {
    jq -er --arg key "$1" '.Stacks[0].Outputs[] | select(.OutputKey == $key) | .OutputValue' "$temp_dir/stack.json"
}
curl_quote() { local value=$1; value=${value//\\/\\\\}; value=${value//\"/\\\"}; printf '%s' "$value"; }
request() {
    local method=$1 endpoint=$2 jar=$3 payload=${4:-} status
    {
        printf 'url = "%s%s"\nrequest = "%s"\n' "$base_url" "$endpoint" "$method"
        printf 'cookie = "%s"\ncookie-jar = "%s"\n' "$(curl_quote "$jar")" "$(curl_quote "$jar")"
        printf 'output = "%s"\n' "$(curl_quote "$temp_dir/response.json")"
        if [[ $method != GET ]]; then
            printf 'header = "Origin: %s"\nheader = "Content-Type: application/json"\n' "$base_url"
            printf 'header = "x-csrf-token: %s"\n' "$(curl_quote "$csrf_token")"
        fi
        [[ -z $payload ]] || printf 'data-binary = "@%s"\n' "$(curl_quote "$payload")"
    } >"$temp_dir/curl.conf"
    status=$(curl --silent --show-error --connect-timeout 15 --max-time 60 \
        --config "$temp_dir/curl.conf" --write-out '%{http_code}' 2>/dev/null) || return 1
    [[ $status =~ ^2[0-9][0-9]$ || ( $method == DELETE && $status == 404 ) ]]
}
fetch_csrf() {
    request GET /api/auth/session "$1" || die "session request failed"
    csrf_token=$(jq -er '.csrfToken | select(type == "string" and length > 0)' "$temp_dir/response.json") || die "missing CSRF token"
}
login_admin() {
    fetch_csrf "$temp_dir/admin.cookies"
    jq '{email:.admin.email,password:.admin.password}' "$fixture_file" >"$temp_dir/payload.json"
    request POST /api/auth/login "$temp_dir/admin.cookies" "$temp_dir/payload.json" || die "admin login failed"
    jq -e '.user.role == "ADMIN"' "$temp_dir/response.json" >/dev/null || die "admin login failed"
    admin_logged_in=true
}
logout_admin() {
    [[ ${admin_logged_in:-false} == true ]] || return 0
    request GET /api/auth/session "$temp_dir/admin.cookies" || return 1
    csrf_token=$(jq -er '.csrfToken' "$temp_dir/response.json") || return 1
    request POST /api/auth/logout "$temp_dir/admin.cookies" || return 1
    admin_logged_in=false
}
journal() {
    jq "$@" "$fixture_file" >"$temp_dir/journal.json"
    mv "$temp_dir/journal.json" "$fixture_file"
    chmod 600 "$fixture_file"
}
