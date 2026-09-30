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
cp "$repo_root/infrastructure/aws/"{Caddyfile.template,kong.prod.yml.template,prepare-runtime.sh,init-databases.sh,bootstrap-admin.sh,start-stack.sh,deploy-on-host.sh,caring-iggy.service} "$subject_dir/"
printf '#!/usr/bin/env bash\nexit 0\n' >"$subject_dir/tests/production-compose.test.sh"
printf '#!/usr/bin/env bash\nexit 0\n' >"$subject_dir/tests/secret-scan.test.sh"
chmod +x "$subject_dir"/*.sh "$subject_dir/tests"/*.sh

aws_log="$fixture_dir/aws.log"
secret_capture="$fixture_dir/secret-capture.json"
change_set_fixture="$fixture_dir/change-set.json"
existing_secret_fixture="$fixture_dir/existing-secret.json"
openssl_counter="$fixture_dir/openssl-counter"
ssm_counter="$fixture_dir/ssm-counter"

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
    s3:cp)
        [[ ${S3_CP_FAIL:-0} != 1 ]]
        ;;
    s3:rm)
        ;;
    ssm:describe-instance-information)
        if [[ $* == *'--output text'* ]]; then
            echo Online
        else
            echo '{"InstanceInformationList":[{"InstanceId":"i-0123456789abcdef0","PingStatus":"Online"}]}'
        fi
        ;;
    ssm:send-command)
        count=0
        [[ -f "$SSM_COUNTER" ]] && read -r count <"$SSM_COUNTER"
        count=$((count + 1))
        printf '%s\n' "$count" >"$SSM_COUNTER"
        if [[ $* == *current-image-tag* ]]; then
            printf 'command-%s\n' "$count" >"$SSM_CURRENT_COMMAND"
        fi
        printf '{"Command":{"CommandId":"command-%s"}}\n' "$count"
        ;;
    ssm:get-command-invocation)
        command_id=""
        while (($#)); do
            if [[ $1 == --command-id ]]; then command_id=$2; break; fi
            shift
        done
        if [[ ${SSM_FAIL_COMMAND:-} == "$command_id" ]]; then
            printf '{"Status":"Failed","StandardOutputContent":"","StandardErrorContent":"fixture failure"}\n'
        elif [[ -f "$SSM_CURRENT_COMMAND" && $command_id == "$(<"$SSM_CURRENT_COMMAND")" ]]; then
            printf '{"Status":"Success","StandardOutputContent":"sha-aaaaaaaaaaaa\\n","StandardErrorContent":""}\n'
        else
            printf '{"Status":"Success","StandardOutputContent":"ok\\n","StandardErrorContent":""}\n'
        fi
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
        private_key_header='-----BEGIN PRIVATE KEY'
        private_key_footer='-----END PRIVATE KEY'
        printf '%s\n' "$private_key_header-----" 'fixture-private-key' "$private_key_footer-----" >"$output"
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
    s_client)
        printf '%s\n' '-----BEGIN CERTIFICATE-----' fixture '-----END CERTIFICATE-----'
        ;;
    x509)
        cat >/dev/null
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
cat >"$bin_dir/curl" <<'EOF'
#!/usr/bin/env bash
printf 'curl %s\n' "$*" >>"$AWS_LOG"
[[ ${CURL_FAIL:-0} != 1 ]]
EOF
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
export SSM_COUNTER="$ssm_counter"
export SSM_CURRENT_COMMAND="$fixture_dir/ssm-current-command"

git -C "$subject_root" init -q
git -C "$subject_root" config user.name fixture
git -C "$subject_root" config user.email fixture@example.org
git -C "$subject_root" add infrastructure/aws
git -C "$subject_root" commit -qm fixture

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
grep -Eq 's3 cp .*s3://artifact-bucket/deployments/' "$aws_log"
[[ $(grep -c 's3 rm s3://artifact-bucket/deployments/' "$aws_log") == 1 ]]
[[ $(grep -c 'ssm send-command' "$aws_log") == 3 ]]
promote_line=$(grep -n "deploy-on-host.sh promote.*sha-0123456789ab" "$aws_log" | cut -d: -f1)
curl_line=$(grep -n '^curl ' "$aws_log" | cut -d: -f1)
[[ -n $promote_line && -n $curl_line && $promote_line -gt $curl_line ]]
if grep -Eq 'fixture-private-key|passwordHex|sessionSecretHex' "$aws_log"; then
    echo "secret material was sent through SSM" >&2
    exit 1
fi
grep -Fq 'sha256sum' "$aws_log"
grep -Eq 'deploy-on-host\.sh.* install' "$aws_log"
grep -Eq 'deploy-on-host\.sh.* release' "$aws_log"

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

: >"$aws_log"
rm -f "$ssm_counter"
export SECRET_STATE=existing
export CURL_FAIL=1
if run_valid >"$fixture_dir/https-failure-output.log" 2>&1; then
    echo "failed HTTPS verification was accepted" >&2
    exit 1
fi
unset CURL_FAIL
grep -Fq 'deploy-on-host.sh rollback' "$aws_log"
if grep -Fq 'deploy-on-host.sh promote' "$aws_log"; then
    echo "failed HTTPS candidate was promoted" >&2
    exit 1
fi
[[ $(grep -c 's3 rm s3://artifact-bucket/deployments/' "$aws_log") == 1 ]]

: >"$aws_log"
export S3_CP_FAIL=1
if run_valid >"$fixture_dir/s3-failure-output.log" 2>&1; then
    echo "failed artifact upload was accepted" >&2
    exit 1
fi
unset S3_CP_FAIL
[[ $(grep -c 's3 rm s3://artifact-bucket/deployments/' "$aws_log") == 1 ]]

: >"$aws_log"
rm -f "$ssm_counter" "$SSM_CURRENT_COMMAND"
export SSM_FAIL_COMMAND=command-2
if run_valid >"$fixture_dir/ssm-failure-output.log" 2>&1; then
    echo "failed SSM rollout was accepted" >&2
    exit 1
fi
unset SSM_FAIL_COMMAND
grep -Fq 'deploy-on-host.sh rollback' "$aws_log"
[[ $(grep -c 's3 rm s3://artifact-bucket/deployments/' "$aws_log") == 1 ]]

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
