#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: disposable-verification.sh \
  --stack-name NAME \
  --budget-ceiling-usd AMOUNT \
  [--previous-certificate-serial HEX] \
  [--region eu-west-2]
EOF
}

die() {
    echo "disposable verification error: $1" >&2
    exit 1
}

stack_name=""
budget_ceiling=""
region="${AWS_REGION:-eu-west-2}"
previous_certificate_serial=""

while (($#)); do
    case "$1" in
        --stack-name|--budget-ceiling-usd|--region|--previous-certificate-serial)
            (($# >= 2)) || {
                usage
                exit 2
            }
            value=$2
            case "$1" in
                --stack-name) stack_name=$value ;;
                --budget-ceiling-usd) budget_ceiling=$value ;;
                --region) region=$value ;;
                --previous-certificate-serial) previous_certificate_serial=$value ;;
            esac
            shift 2
            ;;
        *)
            usage
            exit 2
            ;;
    esac
done

[[ -n $stack_name ]] || die "stack name is required"
[[ $stack_name =~ ^[A-Za-z][A-Za-z0-9-]{0,127}$ ]] || die "invalid stack name"
[[ -n $budget_ceiling ]] || die "budget ceiling is required"
[[ $budget_ceiling =~ ^[0-9]+(\.[0-9]+)?$ ]] || die "budget ceiling must be a positive decimal"
awk -v ceiling="$budget_ceiling" 'BEGIN{exit !(ceiling > 0)}' || die "budget ceiling must be positive"
[[ $region == eu-west-2 ]] || die "region must be eu-west-2"
[[ -z $previous_certificate_serial || $previous_certificate_serial =~ ^[0-9A-Fa-f]+$ ]] || die "invalid previous certificate serial"

for command in aws awk bash curl jq nc openssl tr; do
    command -v "$command" >/dev/null 2>&1 || die "required command is unavailable: $command"
done

[[ $(aws --version 2>&1) == aws-cli/2.* ]] || die "AWS CLI v2 is required"

aws_account=$(aws sts get-caller-identity --region "$region" --query Account --output text) || die "AWS authentication failed"
echo "AWS account: $aws_account"
echo "Region: $region"
echo "Stack: $stack_name"

stack_file=$(mktemp)
trap 'rm -f "$stack_file"' EXIT

aws cloudformation describe-stacks \
    --region "$region" \
    --stack-name "$stack_name" >"$stack_file" || die "failed to describe stack $stack_name"

stack_status=$(jq -r '.Stacks[0].StackStatus' "$stack_file")
stack_purpose=$(jq -r '.Stacks[0].Tags[]? | select(.Key == "Purpose") | .Value' "$stack_file")

[[ $stack_purpose == disposable ]] || die "stack Purpose is '${stack_purpose:-<none>}'; only disposable stacks may be verified"
[[ $stack_status == CREATE_COMPLETE || $stack_status == UPDATE_COMPLETE ]] || die "stack status $stack_status is not ready"

output_value() {
    local key=$1
    jq -er --arg key "$key" '.Stacks[0].Outputs[] | select(.OutputKey == $key) | .OutputValue' "$stack_file"
}

app_secret_arn=$(output_value AppSecretArn)
rds_secret_arn=$(output_value RdsSecretArn)
artifact_bucket=$(output_value ArtifactBucketName)
instance_id=$(output_value InstanceId)
elastic_ip=$(output_value ElasticIp)
rds_endpoint=$(output_value RdsEndpoint)

secret_arn_pattern="^arn:aws:secretsmanager:$region:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$"
[[ $app_secret_arn =~ $secret_arn_pattern ]] || die "stack returned an invalid application secret ARN"
[[ $rds_secret_arn =~ $secret_arn_pattern ]] || die "stack returned an invalid RDS secret ARN"
[[ $instance_id =~ ^i-[0-9a-f]{17}$ ]] || die "stack returned an invalid instance ID"
[[ $elastic_ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || die "stack returned an invalid Elastic IP"
[[ $rds_endpoint =~ ^[A-Za-z0-9.-]+$ ]] || die "stack returned an invalid RDS endpoint"

# Conservative planning inputs for this exact template, not live AWS prices.
# Review an eu-west-2 AWS Pricing Calculator quote before running this verifier.
instance_type=$(aws ec2 describe-instances \
    --region "$region" \
    --instance-ids "$instance_id" \
    --query 'Reservations[0].Instances[0].InstanceType' \
    --output text) || die "failed to describe EC2 instance"

rds_info=$(aws rds describe-db-instances \
    --region "$region" \
    --query "DBInstances[?Endpoint.Address=='$rds_endpoint']" \
    --output json) || die "failed to describe RDS instance"
db_instance_class=$(jq -r '.[0].DBInstanceClass' <<<"$rds_info")
db_allocated_storage=$(jq -r '.[0].AllocatedStorage' <<<"$rds_info")
[[ $(jq -r '.[0].DeletionProtection' <<<"$rds_info") == true ]] || die "source RDS deletion protection must remain enabled"
[[ -n $db_instance_class && $db_instance_class != null ]] || die "could not determine RDS instance class"
[[ $db_allocated_storage =~ ^[0-9]+$ ]] || die "could not determine RDS allocated storage"

[[ $instance_type == t3.medium ]] || die "unsupported EC2 class for cost estimate: $instance_type"
[[ $db_instance_class == db.t4g.small && $db_allocated_storage == 20 ]] || die "unsupported RDS shape for cost estimate"
ec2_hourly=0.06
rds_hourly=0.05

hours_per_month=730
ec2_monthly=$(awk -v h="$hours_per_month" -v p="$ec2_hourly" 'BEGIN{printf "%.2f", h * p}')
rds_instance_monthly=$(awk -v h="$hours_per_month" -v p="$rds_hourly" 'BEGIN{printf "%.2f", h * p}')
ec2_storage_monthly=$(awk -v s=40 -v p=0.10 'BEGIN{printf "%.2f", s * p}')
rds_storage_monthly=$(awk -v s="$db_allocated_storage" -v p=0.14 'BEGIN{printf "%.2f", s * p}')
ipv4_monthly=$(awk -v h="$hours_per_month" 'BEGIN{printf "%.2f", h * 0.005}')
secrets_monthly=0.80
monthly_estimate=$(awk -v a="$ec2_monthly" -v b="$rds_instance_monthly" -v c="$ec2_storage_monthly" -v d="$rds_storage_monthly" -v e="$ipv4_monthly" -v f="$secrets_monthly" 'BEGIN{printf "%.2f", a + b + c + d + e + f}')
restore_monthly=$(awk -v a="$rds_instance_monthly" -v b="$rds_storage_monthly" 'BEGIN{printf "%.2f", a+b}')

echo "Resource types: EC2 $instance_type, RDS $db_instance_class (postgres), Elastic IP, S3 bucket"
echo "Monthly estimate (approximate): USD $monthly_estimate"
echo "Includes EC2, RDS, 40/20 GiB storage, public IPv4, and two secrets."
echo "PITR adds a retained second DB: approximately USD $restore_monthly/month while retained."
echo "Excludes VAT, data transfer, API requests, extra backups, S3, and burst CPU credits."
echo "This gate acknowledges a planning estimate; it is not an AWS billing cap."
echo "Budget ceiling: USD $budget_ceiling"

if awk -v est="$monthly_estimate" -v ceil="$budget_ceiling" 'BEGIN{exit (est <= ceil)}'; then
    die "estimated monthly cost USD $monthly_estimate exceeds budget ceiling USD $budget_ceiling"
fi

# Public port reachability: only 80/443 should be reachable.
echo "Checking public ports..."
for forbidden_port in 22 3000 8000 8001 8081 8082 8083 8084 8085 5432; do
    if nc -z -w 5 "$elastic_ip" "$forbidden_port" >/dev/null 2>&1; then
        die "forbidden port $forbidden_port is reachable on $elastic_ip"
    fi
done
for allowed_port in 80 443; do
    nc -z -w 5 "$elastic_ip" "$allowed_port" || die "port $allowed_port is not reachable on $elastic_ip"
done

# HTTP must redirect to HTTPS.
redirect_headers=$(curl --silent --show-error --max-time 10 -I "http://$elastic_ip/")
redirect_location=$(awk 'tolower($1) == "location:" {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print}' <<<"$redirect_headers")
if ! grep -Eiq '^HTTP/[^ ]+ 30[1278]([[:space:]]|$)' <<<"$redirect_headers" ||
    [[ $redirect_location != "https://$elastic_ip/" ]]; then
    die "HTTP did not redirect to HTTPS"
fi
echo "HTTP redirects to HTTPS"

# Curl checks both the trust chain and the IP SAN against its normal CA store.
curl --fail --silent --show-error --max-time 30 "https://$elastic_ip/" >/dev/null || die "trusted HTTPS application check failed"
cert_pem=$(openssl s_client -connect "$elastic_ip:443" -servername "$elastic_ip" </dev/null 2>/dev/null) || die "failed to fetch TLS certificate"
if ! printf '%s\n' "$cert_pem" | openssl x509 -checkend 86400 -noout >/dev/null 2>&1; then
    die "TLS certificate expires within one day"
fi
cert_issuer=$(printf '%s\n' "$cert_pem" | openssl x509 -noout -issuer)
cert_serial=$(printf '%s\n' "$cert_pem" | openssl x509 -noout -serial)
cert_serial=${cert_serial#serial=}
cert_expiry=$(printf '%s\n' "$cert_pem" | openssl x509 -noout -enddate)
[[ $cert_serial =~ ^[0-9A-Fa-f]+$ ]] || die "invalid certificate serial"
if [[ -n $previous_certificate_serial &&
    $(tr '[:lower:]' '[:upper:]' <<<"$cert_serial") == "$(tr '[:lower:]' '[:upper:]' <<<"$previous_certificate_serial")" ]]; then
    die "certificate serial has not changed; renewal remains unverified"
fi
echo "TLS issuer: $cert_issuer"
echo "TLS serial: $cert_serial"
echo "TLS expiry: $cert_expiry"

ssm_wait_online() {
    local attempt online
    for ((attempt = 1; attempt <= 30; attempt++)); do
        online=$(aws ssm describe-instance-information \
            --region "$region" \
            --filters "Key=InstanceIds,Values=$instance_id" \
            --query 'InstanceInformationList[0].PingStatus' \
            --output text 2>/dev/null || true)
        [[ $online == Online ]] && return 0
        sleep 10
    done
    die "EC2 instance did not register with SSM"
}

ssm_run() {
    local command=$1 mode=${2:-wait} response command_id status attempt
    response=$(aws ssm send-command \
        --region "$region" \
        --instance-ids "$instance_id" \
        --document-name AWS-RunShellScript \
        --parameters "$(jq -cn --arg command "$command" '{commands:[$command]}')" \
        --output json)
    command_id=$(jq -er '.Command.CommandId' <<<"$response")
    [[ $mode != dispatch ]] || return 0
    for ((attempt = 1; attempt <= 120; attempt++)); do
        if ! response=$(aws ssm get-command-invocation \
            --region "$region" \
            --command-id "$command_id" \
            --instance-id "$instance_id" \
            --output json 2>/dev/null); then
            sleep 5
            continue
        fi
        status=$(jq -er '.Status' <<<"$response")
        case $status in
            Success)
                jq -r '.StandardOutputContent // ""' <<<"$response"
                return 0
                ;;
            Pending|InProgress|Delayed) sleep 5 ;;
            *)
                echo "SSM command failed ($status)" >&2
                return 1
                ;;
        esac
    done
    echo "SSM command timed out" >&2
    return 1
}

ssm_wait_online

# Compose health: every expected service container must report healthy.
echo "Checking container health..."
health_body=$(cat <<'BASH'
set -euo pipefail
cd /opt/caring-iggy
read -r IMAGE_TAG </etc/caring-iggy/current-image-tag
[[ $IMAGE_TAG =~ ^sha-[0-9a-f]{12}$ ]] || exit 1
export IMAGE_TAG
for service in caddy frontend kong animal-service adopter-service user-service matching-service reporting-service; do
    container=$(docker compose --env-file /etc/caring-iggy/deployment.env -f docker-compose.prod.yml ps --all -q "$service")
    [[ -n $container && $container != *$'\n'* ]] || { echo "missing or duplicate container: $service" >&2; exit 1; }
    status=$(docker inspect --format '{{.State.Running}} {{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}} {{.State.OOMKilled}}' "$container")
    [[ $status == "true healthy false" ]] || { echo "unhealthy container: $service" >&2; exit 1; }
done
echo all-healthy
BASH
)
printf -v health_command 'bash -c %q' "$health_body"
ssm_run "$health_command" >/dev/null || die "compose health check failed"
echo "All containers healthy"

# Database role isolation is verified by init-databases.sh (idempotent, ends with verify_role).
echo "Checking per-database role isolation..."
ssm_run "set -a; . /etc/caring-iggy/deployment.env; set +a; bash /opt/caring-iggy/init-databases.sh" >/dev/null || die "database isolation check failed"
echo "Database role isolation verified"

# Reboot recovery: restart the host and confirm the stack comes back healthy.
echo "Checking reboot recovery..."
boot_id_before=$(ssm_run "cat /proc/sys/kernel/random/boot_id") || die "could not read pre-reboot boot ID"
boot_id_pattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
[[ $boot_id_before =~ $boot_id_pattern ]] || die "invalid pre-reboot boot ID"
# Reboot can terminate its own SSM invocation; dispatch acceptance is sufficient.
ssm_run "shutdown -r +0" dispatch >/dev/null || die "reboot dispatch failed"
# PingStatus may remain cached Online throughout a short reboot. Each sample
# sends a new command; only a fresh different boot ID plus health proves recovery.
recovered=false
for ((attempt = 1; attempt <= 120; attempt++)); do
    online=$(aws ssm describe-instance-information --region "$region" \
        --filters "Key=InstanceIds,Values=$instance_id" \
        --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)
    if [[ $online == Online ]]; then
        boot_id_after=$(ssm_run "cat /proc/sys/kernel/random/boot_id" 2>/dev/null || true)
        if [[ $boot_id_after =~ $boot_id_pattern && $boot_id_after != "$boot_id_before" ]] &&
            ssm_run "$health_command" >/dev/null 2>&1; then
            recovered=true
            break
        fi
    fi
    sleep 10
done
[[ $recovered == true ]] || die "fresh boot and healthy containers were not verified after reboot"
echo "Reboot recovery verified"

# Bad-tag rollback: a non-existent image release must be undoable.
echo "Checking bad-tag rollback..."
image_tag_before=$(ssm_run "cat /etc/caring-iggy/current-image-tag") || die "could not read current immutable image tag"
[[ $image_tag_before =~ ^sha-[0-9a-f]{12}$ ]] || die "invalid current immutable image tag"
if ssm_run "bash /opt/caring-iggy/deploy-on-host.sh release sha-000000000000" >/dev/null 2>&1; then
    die "bad-tag release unexpectedly succeeded"
fi
candidate_body=$(cat <<'BASH'
set -euo pipefail
read -r previous </etc/caring-iggy/previous-image-tag
read -r candidate </etc/caring-iggy/candidate-image-tag
[[ $previous == "$1" && $candidate == sha-000000000000 ]] || exit 1
BASH
)
printf -v candidate_command 'bash -c %q verification %q' "$candidate_body" "$image_tag_before"
ssm_run "$candidate_command" >/dev/null || die "bad release did not reach the expected candidate phase; rollback acceptance failed"
ssm_run "bash /opt/caring-iggy/deploy-on-host.sh rollback" >/dev/null || die "rollback command failed"
rollback_body=$(cat <<'BASH'
set -euo pipefail
cd /opt/caring-iggy
read -r IMAGE_TAG </etc/caring-iggy/current-image-tag
[[ $IMAGE_TAG == "$1" ]] || { echo "incorrect restored tag" >&2; exit 1; }
export IMAGE_TAG
set -a
. /etc/caring-iggy/deployment.env
set +a
for service in frontend animal-service adopter-service user-service matching-service reporting-service; do
    container=$(docker compose --env-file /etc/caring-iggy/deployment.env -f docker-compose.prod.yml ps --all -q "$service")
    [[ -n $container && $container != *$'\n'* ]] || exit 1
    image=$(docker inspect --format '{{.Config.Image}}' "$container")
    [[ $image == "${DOCKER_IMAGE_PREFIX:?}-$service:$1" ]] || { echo "incorrect restored image: $service" >&2; exit 1; }
done
BASH
)
printf -v rollback_command 'bash -c %q verification %q' "$rollback_body" "$image_tag_before"
ssm_run "$rollback_command" >/dev/null || die "rollback did not restore the captured tag and all six application images"
ssm_run "$health_command" >/dev/null || die "health check after rollback failed"
echo "Bad-tag rollback verified"

# PITR restore into a separately named temporary DB instance.
echo "Checking point-in-time restore..."
source_db_id=$(jq -r '.[0].DBInstanceIdentifier' <<<"$rds_info")
[[ -n $source_db_id && $source_db_id != null ]] || die "could not determine source RDS identifier"
timestamp=$(date -u +%Y%m%d%H%M%S)
target_db_id="${stack_name:0:40}-pitr-${timestamp}-$$"
target_db_id=$(tr '[:upper:]' '[:lower:]' <<<"$target_db_id" | tr -s '-')
# Trim if needed to stay within AWS 63-character limit.
target_db_id="${target_db_id:0:63}"

security_groups=()
while IFS= read -r sg; do
    [[ -n $sg ]] && security_groups+=("$sg")
done < <(jq -r '.[0].VpcSecurityGroups[]? .VpcSecurityGroupId' <<<"$rds_info")
db_subnet_group=$(jq -r '.[0].DBSubnetGroup.DBSubnetGroupName' <<<"$rds_info")

((${#security_groups[@]} > 0)) || die "could not determine RDS security groups"
[[ -n $db_subnet_group && $db_subnet_group != null ]] || die "could not determine RDS subnet group"
echo "PITR target (retained for manual review): $target_db_id"

aws rds restore-db-instance-to-point-in-time \
    --region "$region" \
    --source-db-instance-identifier "$source_db_id" \
    --target-db-instance-identifier "$target_db_id" \
    --use-latest-restorable-time \
    --no-publicly-accessible \
    --deletion-protection \
    --vpc-security-group-ids "${security_groups[@]}" \
    --db-subnet-group-name "$db_subnet_group" \
    --copy-tags-to-snapshot >/dev/null || die "PITR restore request failed"

aws rds wait db-instance-available \
    --region "$region" \
    --db-instance-identifier "$target_db_id" || die "temporary RDS instance did not become available"

temp_endpoint=$(aws rds describe-db-instances \
    --region "$region" \
    --db-instance-identifier "$target_db_id" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text) || die "could not read temporary RDS endpoint"

[[ $temp_endpoint =~ ^[A-Za-z0-9.-]+$ ]] || die "invalid restored RDS endpoint"
pit_verify_command="set -eu; secret=\$(aws secretsmanager get-secret-value --region '$region' --secret-id '$rds_secret_arn' --query SecretString --output text); PGUSER=\$(printf '%s' \"\$secret\" | jq -er '.username'); PGPASSWORD=\$(printf '%s' \"\$secret\" | jq -er '.password'); export PGUSER PGPASSWORD; docker run --rm --network caring-iggy_backend -e PGUSER -e PGPASSWORD -e PGSSLMODE=require postgres:15-alpine@sha256:25d430274d8a31184f9435cc5b2f56aff254952065bbbcac0c51acedb5a1d1e7 sh -ec 'psql -h $temp_endpoint -U \"\$PGUSER\" -d postgres -Atqc \"SELECT 1\" | grep -qx 1'"
ssm_run "$pit_verify_command" >/dev/null || die "temporary RDS verification failed"
echo "Point-in-time restore verified: $target_db_id ($temp_endpoint)"

# Cleanup checklist: nothing is deleted automatically; deletion protection stays enabled.
cat <<EOF

Cleanup checklist (manual):
- Review CloudFormation stack "$stack_name" (RDS deletion protection remains enabled)
- Review the protected temporary RDS instance "$target_db_id"; disable only its protection before a separate manual deletion
- Empty the S3 artifact bucket "$artifact_bucket" only when decommissioning the stack
- Delete the CloudFormation stack separately when you are ready to create the final RDS snapshot
- No automated destroy command exists in this repository
EOF

echo "Disposable verification complete"
