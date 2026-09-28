#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
source_script="$repo_root/infrastructure/aws/deploy-aws.sh"
[[ -x "$source_script" ]] || {
    echo "deploy-aws.sh is missing" >&2
    exit 1
}

fixture_dir=$(mktemp -d)
cleanup() {
    local status=$?
    if ((status != 0)); then
        echo "deploy test failed; captured command log:" >&2
        [[ -f "$fixture_dir/aws.log" ]] && cat "$fixture_dir/aws.log" >&2
        for log in "$fixture_dir"/*-output.log; do
            [[ -f "$log" ]] && cat "$log" >&2
        done
    fi
    rm -rf "$fixture_dir"
    exit "$status"
}
trap cleanup EXIT
bin_dir="$fixture_dir/bin"
subject_root="$fixture_dir/repo"
subject_dir="$subject_root/infrastructure/aws"
mkdir -p "$bin_dir" "$subject_dir/tests"
cp "$source_script" "$subject_dir/deploy-aws.sh"
cp "$repo_root/infrastructure/aws/template.yml" "$subject_dir/template.yml"
cp "$repo_root/infrastructure/aws/docker-compose.prod.yml" "$subject_dir/docker-compose.prod.yml"
printf '# test\n' >"$subject_dir/Caddyfile.template"
printf '_format_version: "3.0"\n' >"$subject_dir/kong.prod.yml.template"
printf '#!/usr/bin/env bash\nexit 0\n' >"$subject_dir/tests/production-compose.test.sh"
printf '#!/usr/bin/env bash\nexit 0\n' >"$subject_dir/tests/secret-scan.test.sh"
chmod +x "$subject_dir"/*.sh "$subject_dir/tests"/*.sh

aws_log="$fixture_dir/aws.log"
secret_capture="$fixture_dir/secret-capture.json"
change_set_fixture="$fixture_dir/change-set.json"
existing_secret_fixture="$fixture_dir/existing-secret.json"
openssl_counter="$fixture_dir/openssl-counter"

cat >"$bin_dir/aws" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$AWS_LOG"
if [[ ${1:-} == "--version" ]]; then
    echo 'aws-cli/2.31.0 Python/3.13 Linux/6 exe/x86_64'
    exit 0
fi
service=${1:-}
operation=${2:-}
case "$service:$operation" in
    sts:get-caller-identity)
        echo '{"Account":"123456789012","Arn":"arn:aws:iam::123456789012:user/test"}'
        ;;
    cloudformation:describe-stacks)
        cat <<'JSON'
{"Stacks":[{"StackStatus":"UPDATE_COMPLETE","Outputs":[
  {"OutputKey":"InstanceId","OutputValue":"i-0123456789abcdef0"},
  {"OutputKey":"ElasticIp","OutputValue":"192.0.2.10"},
  {"OutputKey":"RdsEndpoint","OutputValue":"db.example.internal"},
  {"OutputKey":"AppSecretArn","OutputValue":"arn:aws:secretsmanager:eu-west-2:123456789012:secret:app"},
  {"OutputKey":"RdsSecretArn","OutputValue":"arn:aws:secretsmanager:eu-west-2:123456789012:secret:rds"},
  {"OutputKey":"ArtifactBucketName","OutputValue":"artifact-bucket"},
  {"OutputKey":"InstanceProfileArn","OutputValue":"arn:aws:iam::123456789012:instance-profile/app"},
  {"OutputKey":"StackName","OutputValue":"caring-iggy-test"}
]}]}
JSON
        ;;
    cloudformation:create-change-set)
        echo '{"Id":"arn:aws:cloudformation:eu-west-2:123456789012:changeSet/test/1"}'
        ;;
    cloudformation:wait)
        ;;
    cloudformation:describe-change-set)
        cat "$CHANGE_SET_FIXTURE"
        ;;
    cloudformation:execute-change-set)
        ;;
    secretsmanager:list-secret-version-ids)
        if [[ ${SECRET_STATE:-empty} == existing ]]; then
            echo '{"Versions":[{"VersionId":"v1","VersionStages":["AWSCURRENT"]}]}'
        else
            echo '{"Versions":[]}'
        fi
        ;;
    secretsmanager:get-secret-value)
        jq -n --rawfile secret "$EXISTING_SECRET_FIXTURE" '{SecretString: $secret}'
        ;;
    secretsmanager:put-secret-value)
        secret_arg=""
        while (($#)); do
            if [[ $1 == --secret-string ]]; then
                secret_arg=$2
                break
            fi
            shift
        done
        cp "${secret_arg#file://}" "$SECRET_CAPTURE"
        echo '{"VersionId":"v1"}'
        ;;
    *)
        echo "unexpected aws call: $*" >&2
        exit 2
        ;;
esac
EOF

cat >"$bin_dir/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ ${1:-} == compose && ${2:-} == version ]]; then
    echo '5.5.1'
    exit 0
fi
exit 0
EOF

cat >"$bin_dir/openssl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
    version)
        echo 'OpenSSL 3.5.0'
        ;;
    genpkey)
        while (($#)); do
            if [[ $1 == -out ]]; then output=$2; break; fi
            shift
        done
        printf '%s\n' '-----BEGIN PRIVATE KEY-----' 'fixture-private-key' '-----END PRIVATE KEY-----' >"$output"
        ;;
    pkey)
        while (($#)); do
            if [[ $1 == -out ]]; then output=$2; break; fi
            shift
        done
        printf '%s\n' '-----BEGIN PUBLIC KEY-----' 'fixture-public-key' '-----END PUBLIC KEY-----' >"$output"
        ;;
    rand)
        count=0
        [[ -f "$OPENSSL_COUNTER" ]] && read -r count <"$OPENSSL_COUNTER"
        count=$((count + 1))
        printf '%s\n' "$count" >"$OPENSSL_COUNTER"
        printf '%064x\n' "$count"
        ;;
    *) exit 2 ;;
esac
EOF

for command in shellcheck cfn-lint trivy; do
    cat >"$bin_dir/$command" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
done
chmod +x "$bin_dir"/*

cat >"$change_set_fixture" <<'EOF'
{"Status":"CREATE_COMPLETE","Changes":[]}
EOF
jq -n '{initialAdmin: {email: "admin@example.org", passwordHex: ("4" * 64)}}' \
    >"$existing_secret_fixture"

export AWS_LOG="$aws_log"
export SECRET_CAPTURE="$secret_capture"
export CHANGE_SET_FIXTURE="$change_set_fixture"
export EXISTING_SECRET_FIXTURE="$existing_secret_fixture"
export OPENSSL_COUNTER="$openssl_counter"

common_args=(
    --stack-name caring-iggy-test
    --stack-purpose disposable
    --image-owner example-owner
    --image-tag sha-0123456789ab
    --admin-email admin@example.org
    --region eu-west-2
)

assert_no_mutation() {
    if grep -Eq 'cloudformation (create-change-set|execute-change-set)|secretsmanager put-secret-value|ssm send-command' "$aws_log"; then
        echo "AWS mutation occurred before input validation completed" >&2
        exit 1
    fi
}

assert_rejected() {
    local label=$1
    shift
    : >"$aws_log"
    if PATH="$bin_dir:$PATH" bash "$source_script" "$@" >/dev/null 2>&1; then
        echo "invalid input accepted: $label" >&2
        exit 1
    fi
    assert_no_mutation
}

: >"$aws_log"
mv "$bin_dir/aws" "$bin_dir/aws.disabled"
if PATH="$bin_dir:/usr/bin:/bin" bash "$source_script" "${common_args[@]}" >/dev/null 2>&1; then
    echo "missing AWS CLI was accepted" >&2
    exit 1
fi
mv "$bin_dir/aws.disabled" "$bin_dir/aws"
assert_no_mutation

assert_rejected wrong-region "${common_args[@]:0:10}" --region us-east-1
assert_rejected missing-owner \
    --stack-name caring-iggy-test --stack-purpose disposable \
    --image-tag sha-0123456789ab --admin-email admin@example.org --region eu-west-2
assert_rejected malformed-email \
    --stack-name caring-iggy-test --stack-purpose disposable --image-owner example-owner \
    --image-tag sha-0123456789ab --admin-email not-an-email --region eu-west-2
for bad_tag in latest 0123456789ab sha-main sha-0123456789a sha-0123456789abc sha-0123456789AB; do
    assert_rejected "bad-tag-$bad_tag" \
        --stack-name caring-iggy-test --stack-purpose disposable --image-owner example-owner \
        --image-tag "$bad_tag" --admin-email admin@example.org --region eu-west-2
done

run_valid() {
    PATH="$bin_dir:$PATH" bash "$subject_dir/deploy-aws.sh" "${common_args[@]}"
}

: >"$aws_log"
export SECRET_STATE=existing
run_valid >"$fixture_dir/existing-output.log"
[[ $(grep -c 'secretsmanager put-secret-value' "$aws_log" || true) == 0 ]]
grep -Fq -- '--capabilities CAPABILITY_IAM' "$aws_log"

: >"$aws_log"
rm -f "$openssl_counter"
rm -f "$secret_capture"
export SECRET_STATE=empty
run_valid >"$fixture_dir/first-output.log"
[[ $(grep -c 'secretsmanager put-secret-value' "$aws_log") == 1 ]]
if grep 'cloudformation create-change-set' "$aws_log" | grep -Fqv -- '--capabilities CAPABILITY_IAM'; then
    echo "change set omitted CAPABILITY_IAM" >&2
    exit 1
fi
jq -e '
    .jwt.keyId == "ci-key-1" and
    (.jwt.privateKeyBase64 | type == "string") and
    (.jwt.publicKeyBase64 | type == "string") and
    (.frontend.sessionSecretHex | test("^[0-9a-f]{64}$")) and
    (.frontend.csrfSecretHex | test("^[0-9a-f]{64}$")) and
    (.databases.animals.passwordHex | test("^[0-9a-f]{64}$")) and
    (.databases.users.passwordHex | test("^[0-9a-f]{64}$")) and
    (.databases.adopters.passwordHex | test("^[0-9a-f]{64}$")) and
    (.initialAdmin.passwordHex | test("^[0-9a-f]{64}$")) and
    ([.frontend.sessionSecretHex, .frontend.csrfSecretHex,
      .databases.animals.passwordHex, .databases.users.passwordHex,
      .databases.adopters.passwordHex, .initialAdmin.passwordHex] | unique | length == 6)
' "$secret_capture" >/dev/null

cat >"$change_set_fixture" <<'EOF'
{"Status":"CREATE_COMPLETE","Changes":[{"ResourceChange":{"LogicalResourceId":"Database","ResourceType":"AWS::RDS::DBInstance","Replacement":"True"}}]}
EOF
: >"$aws_log"
export SECRET_STATE=existing
if run_valid >"$fixture_dir/replacement-output.log" 2>&1; then
    echo "RDS replacement change set was accepted" >&2
    exit 1
fi
if grep -Eq 'cloudformation execute-change-set|ssm send-command' "$aws_log"; then
    echo "RDS replacement reached execution or SSM" >&2
    exit 1
fi

echo "deploy preflight and secret lifecycle contract: PASS"
