#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
source_script="$repo_root/infrastructure/aws/disposable-verification.sh"
[[ -x "$source_script" ]] || {
    echo "disposable-verification.sh is missing" >&2
    exit 1
}

fixture_dir=$(mktemp -d)
cleanup() {
    local status=$?
    if ((status != 0)); then
        echo "disposable verification test failed; captured logs:" >&2
        [[ -f "$fixture_dir/aws.log" ]] && cat "$fixture_dir/aws.log" >&2
        [[ -f "$fixture_dir/nc.log" ]] && cat "$fixture_dir/nc.log" >&2
        [[ -f "$fixture_dir/curl.log" ]] && cat "$fixture_dir/curl.log" >&2
        [[ -f "$fixture_dir/openssl.log" ]] && cat "$fixture_dir/openssl.log" >&2
        [[ -f "$fixture_dir/output.log" ]] && cat "$fixture_dir/output.log" >&2
    fi
    rm -rf "$fixture_dir"
    exit "$status"
}
trap cleanup EXIT

bin_dir="$fixture_dir/bin"
subject_root="$fixture_dir/repo"
subject_dir="$subject_root/infrastructure/aws"
mkdir -p "$bin_dir" "$subject_dir/tests"
cp "$source_script" "$subject_dir/disposable-verification.sh"
chmod +x "$subject_dir/disposable-verification.sh"

aws_log="$fixture_dir/aws.log"
nc_log="$fixture_dir/nc.log"
curl_log="$fixture_dir/curl.log"
openssl_log="$fixture_dir/openssl.log"
output_log="$fixture_dir/output.log"

ssm_store="$fixture_dir/ssm-store"
mkdir -p "$ssm_store"
ssm_counter="$fixture_dir/ssm-counter"

cat >"$bin_dir/aws" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$AWS_LOG"
if [[ ${1:-} == "--version" ]]; then
    echo 'aws-cli/2.31.0 Python/3.13 Linux/6 exe/x86_64'
    exit 0
fi
full_args=("$@")
service=${1:-}
operation=${2:-}
shift 2 || true

target_id=""
db_instance_id=""
source_id=""
while (($#)); do
    case "$1" in
        --target-db-instance-identifier) target_id=$2; shift 2 ;;
        --db-instance-identifier) db_instance_id=$2; shift 2 ;;
        --source-db-instance-identifier) source_id=$2; shift 2 ;;
        --restore-time|--vpc-security-group-ids|--db-subnet-group-name|--query|--output|--region) shift 2 ;;
        *) shift ;;
    esac
done

case "$service:$operation" in
    sts:get-caller-identity)
        echo '123456789012'
        ;;
    cloudformation:describe-stacks)
        purpose=${STACK_PURPOSE:-disposable}
        cat <<JSON
{"Stacks":[{"StackStatus":"UPDATE_COMPLETE","Tags":[{"Key":"Purpose","Value":"$purpose"}],"Outputs":[
  {"OutputKey":"InstanceId","OutputValue":"i-0123456789abcdef0"},
  {"OutputKey":"ElasticIp","OutputValue":"192.0.2.10"},
  {"OutputKey":"RdsEndpoint","OutputValue":"db.example.internal"},
  {"OutputKey":"AppSecretArn","OutputValue":"arn:aws:secretsmanager:eu-west-2:123456789012:secret:app"},
  {"OutputKey":"RdsSecretArn","OutputValue":"arn:aws:secretsmanager:eu-west-2:123456789012:secret:rds"},
  {"OutputKey":"ArtifactBucketName","OutputValue":"caring-iggy-disposable-artifacts"},
  {"OutputKey":"InstanceProfileArn","OutputValue":"arn:aws:iam::123456789012:instance-profile/app"},
  {"OutputKey":"StackName","OutputValue":"caring-iggy-disposable"}
]}]}
JSON
        ;;
    ec2:describe-instances)
        echo '{"Reservations":[{"Instances":[{"InstanceType":"t3.medium"}]}]}'
        ;;
    rds:describe-db-instances)
        if [[ -n ${db_instance_id:-} ]]; then
            printf '%s.example.internal\n' "$db_instance_id"
        else
            echo '[{"DBInstanceIdentifier":"caring-iggy-disposable-db","Endpoint":{"Address":"db.example.internal"},"DBInstanceClass":"db.t4g.small","AllocatedStorage":20,"VpcSecurityGroups":[{"VpcSecurityGroupId":"sg-12345"}],"DBSubnetGroupName":"caring-iggy-db-subnet","DeletionProtection":true}]'
        fi
        ;;
    rds:restore-db-instance-to-point-in-time)
        printf '{"DBInstance":{"DBInstanceIdentifier":"%s"}}\n' "${target_id:-unknown}"
        ;;
    rds:wait)
        ;;
    ssm:describe-instance-information)
        if [[ ${full_args[*]} == *'--output text'* ]]; then
            echo 'Online'
        else
            echo '{"InstanceInformationList":[{"InstanceId":"i-0123456789abcdef0","PingStatus":"Online"}]}'
        fi
        ;;
    ssm:send-command)
        count=0
        [[ -f "$SSM_COUNTER" ]] && read -r count <"$SSM_COUNTER"
        count=$((count + 1))
        printf '%s\n' "$count" >"$SSM_COUNTER"
        command_id="command-$count"
        # Extract command text from --parameters JSON using the original args.
        params=""
        for ((i=0; i<${#full_args[@]}; i++)); do
            if [[ ${full_args[$i]} == --parameters ]]; then
                params=${full_args[$((i+1))]:-}
                break
            fi
        done
        if [[ -n $params ]]; then
            command_text=$(printf '%s' "$params" | jq -r '.commands[0] // empty')
            printf '%s' "$command_text" >"$SSM_STORE/$command_id.command"
        fi
        printf '{"Command":{"CommandId":"%s"}}\n' "$command_id"
        ;;
    ssm:get-command-invocation)
        command_id=""
        for ((i=0; i<${#full_args[@]}; i++)); do
            if [[ ${full_args[$i]} == --command-id ]]; then
                command_id=${full_args[$((i+1))]:-}
                break
            fi
        done
        command_text=""
        [[ -f "$SSM_STORE/$command_id.command" ]] && command_text=$(<"$SSM_STORE/$command_id.command")
        if [[ $command_text == *'release sha-000000000000'* ]]; then
            printf '{"Status":"Failed","StandardOutputContent":"","StandardErrorContent":"bad image"}\n'
        elif [[ $command_text == *'shutdown -r'* || $command_text == *'reboot'* ]]; then
            printf '{"Status":"Success","StandardOutputContent":"","StandardErrorContent":""}\n'
        else
            printf '{"Status":"Success","StandardOutputContent":"ok\\n","StandardErrorContent":""}\n'
        fi
        ;;
    secretsmanager:get-secret-value)
        secret_id=""
        for ((i=0; i<${#full_args[@]}; i++)); do
            if [[ ${full_args[$i]} == --secret-id ]]; then
                secret_id=${full_args[$((i+1))]:-}
                break
            fi
        done
        if [[ $secret_id == *rds* ]]; then
            jq -n '{SecretString:{username:"caring_iggy_master",password:"master-password"}}'
        else
            jq -n '{initialAdmin:{email:"admin@example.org",passwordHex:("4" * 64)},databases:{animals:{username:"animals_app",passwordHex:("1" * 64)},users:{username:"users_app",passwordHex:("2" * 64)},adopters:{username:"adopters_app",passwordHex:("3" * 64)}}}'
        fi
        ;;

    *)
        echo "unexpected aws call: $service:$operation $*" >&2
        exit 2
        ;;
esac
EOF

cat >"$bin_dir/nc" <<'EOF'
#!/usr/bin/env bash
port=""
prev=""
for arg; do
    if [[ $arg =~ ^[0-9]+$ && $prev != -w ]]; then
        port=$arg
    fi
    prev=$arg
done
printf 'nc %s\n' "$port" >>"$NC_LOG"
if [[ $port == 80 || $port == 443 ]]; then
    exit 0
fi
exit 1
EOF

cat >"$bin_dir/curl" <<'EOF'
#!/usr/bin/env bash
printf 'curl %s\n' "$*" >>"$CURL_LOG"
if [[ $* == *'http://192.0.2.10/'* && $* == *'-I'* || $* == *'--head'* ]]; then
    printf 'HTTP/1.1 302 Found\nLocation: https://192.0.2.10/\n\n'
    exit 0
fi
exit 0
EOF

cat >"$bin_dir/openssl" <<'EOF'
#!/usr/bin/env bash
printf 'openssl %s\n' "$*" >>"$OPENSSL_LOG"
case "${1:-}" in
    version)
        echo 'OpenSSL 3.5.0'
        exit 0
        ;;
    s_client)
        printf -- '-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----\n'
        exit 0
        ;;
    x509)
        if [[ $* == *-issuer* ]]; then
            echo 'issuer=CN = R3, O = Lets Encrypt, C = US'
        fi
        exit 0
        ;;
    *) exit 0 ;;
esac
EOF

chmod +x "$bin_dir"/*

export AWS_LOG="$aws_log"
export NC_LOG="$nc_log"
export CURL_LOG="$curl_log"
export OPENSSL_LOG="$openssl_log"
export SSM_COUNTER="$ssm_counter"
export SSM_STORE="$ssm_store"

run_verifier() {
    PATH="$bin_dir:$PATH" bash "$subject_dir/disposable-verification.sh" "$@" >"$output_log" 2>&1
}

assert_rejected() {
    local label=$1
    shift
    : >"$aws_log"
    : >"$nc_log"
    : >"$curl_log"
    : >"$openssl_log"
    if PATH="$bin_dir:$PATH" bash "$subject_dir/disposable-verification.sh" "$@" >"$output_log" 2>&1; then
        echo "invalid input accepted: $label" >&2
        exit 1
    fi
}

assert_no_destruction() {
    if grep -Eq 'cloudformation delete-stack|rds delete-db-instance|ec2 terminate-instances|rds modify-db-instance.*DeletionProtection|s3 rb|cloudformation update-stack' "$aws_log"; then
        echo "destructive or protection-modifying call detected" >&2
        exit 1
    fi
}

# Missing required arguments should fail.
assert_rejected missing-args --stack-name caring-iggy-disposable
assert_rejected missing-budget --budget-ceiling-usd 100

# Wrong region should fail.
assert_rejected wrong-region --stack-name caring-iggy-disposable --budget-ceiling-usd 100 --region us-east-1

# Production stack must be refused.
export STACK_PURPOSE=production
assert_rejected production-stack \
    --stack-name caring-iggy-production \
    --budget-ceiling-usd 100 \
    --region eu-west-2
unset STACK_PURPOSE

# Budget ceiling too low should fail.
assert_rejected low-budget \
    --stack-name caring-iggy-disposable \
    --budget-ceiling-usd 1 \
    --region eu-west-2

# Valid disposable verification should pass.
: >"$aws_log"
: >"$nc_log"
: >"$curl_log"
: >"$openssl_log"
run_verifier --stack-name caring-iggy-disposable --budget-ceiling-usd 100 --region eu-west-2
assert_no_destruction

# Account and stack are confirmed.
grep -Fq '123456789012' "$output_log" || {
    echo "caller account not printed" >&2
    exit 1
}
grep -Fq 'caring-iggy-disposable' "$output_log" || {
    echo "stack name not printed" >&2
    exit 1
}

# Only TCP 80/443 were checked for reachability.
for required_port in 80 443; do
    grep -Eq "^nc ${required_port}$" "$nc_log" || {
        echo "port $required_port reachability check missing" >&2
        exit 1
    }
done
for forbidden_port in 22 3000 8000 5432; do
    if grep -Eq "^nc ${forbidden_port}$" "$nc_log"; then
        echo "forbidden port $forbidden_port was checked via nc" >&2
        exit 1
    fi
done

# HTTP redirect and TLS checks occurred.
grep -Eq 'curl .*http://192\.0\.2\.10/' "$curl_log" || {
    echo "HTTP redirect curl missing" >&2
    exit 1
}
grep -Eq 'openssl s_client .*192\.0\.2\.10:443' "$openssl_log" || {
    echo "TLS s_client check missing" >&2
    exit 1
}
grep -Eq 'openssl x509 .*-checkend' "$openssl_log" || {
    echo "TLS expiry check missing" >&2
    exit 1
}

# SSM checks: health, database isolation, reboot, bad-tag rollback.
ssm_commands=$(cat "$ssm_store"/*.command 2>/dev/null || true)
[[ $ssm_commands == *'docker inspect'* || $ssm_commands == *'healthy'* ]] || {
    echo "compose health check missing" >&2
    exit 1
}
[[ $ssm_commands == *'init-databases.sh'* ]] || {
    echo "database isolation check missing" >&2
    exit 1
}
[[ $ssm_commands == *'shutdown -r'* || $ssm_commands == *'reboot'* ]] || {
    echo "reboot command missing" >&2
    exit 1
}
[[ $ssm_commands == *'release sha-000000000000'* ]] || {
    echo "bad-tag release command missing" >&2
    exit 1
}
[[ $ssm_commands == *'deploy-on-host.sh rollback'* ]] || {
    echo "rollback command missing" >&2
    exit 1
}

# PITR restore into a separate temporary instance.
grep -Eq 'rds restore-db-instance-to-point-in-time' "$aws_log" || {
    echo "PITR restore missing" >&2
    exit 1
}
target_id=$(grep -oE -- '--target-db-instance-identifier [^ ]+' "$aws_log" | awk '{print $2}' | tail -n1)
[[ -n $target_id && $target_id != "caring-iggy-disposable-db" ]] || {
    echo "PITR target id missing or not separate" >&2
    exit 1
}
grep -Eq 'rds wait db-instance-available' "$aws_log" || {
    echo "PITR wait missing" >&2
    exit 1
}
[[ $ssm_commands == *"$target_id.example.internal"* ]] || {
    echo "temporary RDS endpoint not verified via SSM" >&2
    exit 1
}

# Resource types, estimate, and cleanup checklist printed.
grep -Eiq 'EC2|RDS|EIP|S3' "$output_log" || {
    echo "resource types missing" >&2
    exit 1
}
grep -Eiq 'monthly estimate|budget ceiling' "$output_log" || {
    echo "monthly estimate/budget ceiling missing" >&2
    exit 1
}
grep -Eiq 'cleanup checklist|delete temporary rds|empty.*bucket|delete stack' "$output_log" || {
    echo "cleanup checklist missing" >&2
    exit 1
}

echo "disposable verification contract: PASS"
