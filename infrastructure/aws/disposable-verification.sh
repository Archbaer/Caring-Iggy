#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: disposable-verification.sh \
  --stack-name NAME \
  --budget-ceiling-usd AMOUNT \
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

while (($#)); do
    case "$1" in
        --stack-name|--budget-ceiling-usd|--region)
            (($# >= 2)) || {
                usage
                exit 2
            }
            value=$2
            case "$1" in
                --stack-name) stack_name=$value ;;
                --budget-ceiling-usd) budget_ceiling=$value ;;
                --region) region=$value ;;
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
[[ $region == eu-west-2 ]] || die "region must be eu-west-2"

for command in aws bash curl jq nc openssl; do
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

# Monthly cost estimate (eu-west-2 on-demand approximations, not a quote).
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
[[ -n $db_instance_class && $db_instance_class != null ]] || die "could not determine RDS instance class"
[[ $db_allocated_storage =~ ^[0-9]+$ ]] || die "could not determine RDS allocated storage"

case "$instance_type" in
    t3.medium) ec2_hourly=0.0416 ;;
    t3.small) ec2_hourly=0.0208 ;;
    t3.micro) ec2_hourly=0.0104 ;;
    *) ec2_hourly=0.0416 ;;
esac

case "$db_instance_class" in
    db.t4g.small) rds_hourly=0.0134 ;;
    db.t4g.micro) rds_hourly=0.0067 ;;
    db.t3.small) rds_hourly=0.017 ;;
    *) rds_hourly=0.0134 ;;
esac

hours_per_month=730
ec2_monthly=$(awk -v h="$hours_per_month" -v p="$ec2_hourly" 'BEGIN{printf "%.2f", h * p}')
rds_instance_monthly=$(awk -v h="$hours_per_month" -v p="$rds_hourly" 'BEGIN{printf "%.2f", h * p}')
# gp3 storage: $0.091/GB-month.
ec2_storage_monthly=$(awk -v s=40 -v p=0.091 'BEGIN{printf "%.2f", s * p}')
rds_storage_monthly=$(awk -v s="$db_allocated_storage" -v p=0.091 'BEGIN{printf "%.2f", s * p}')
monthly_estimate=$(awk -v a="$ec2_monthly" -v b="$rds_instance_monthly" -v c="$ec2_storage_monthly" -v d="$rds_storage_monthly" 'BEGIN{printf "%.2f", a + b + c + d}')

echo "Resource types: EC2 $instance_type, RDS $db_instance_class (postgres), Elastic IP, S3 bucket"
echo "Monthly estimate (approximate): USD $monthly_estimate"
echo "Budget ceiling: USD $budget_ceiling"

if awk -v est="$monthly_estimate" -v ceil="$budget_ceiling" 'BEGIN{exit (est <= ceil)}'; then
    die "estimated monthly cost USD $monthly_estimate exceeds budget ceiling USD $budget_ceiling"
fi

# Public port reachability: only 80/443 should be reachable.
echo "Checking public ports..."
for forbidden_port in 22 3000 8000 5432; do
    if timeout 5 bash -c "exec 3<>/dev/tcp/$elastic_ip/$forbidden_port" 2>/dev/null; then
        die "forbidden port $forbidden_port is reachable on $elastic_ip"
    fi
done
for allowed_port in 80 443; do
    nc -z -w 5 "$elastic_ip" "$allowed_port" || die "port $allowed_port is not reachable on $elastic_ip"
done

# HTTP must redirect to HTTPS.
redirect_headers=$(curl --silent --show-error --max-time 10 -I "http://$elastic_ip/")
if ! grep -Eiq '^Location:\s*https://' <<<"$redirect_headers"; then
    die "HTTP did not redirect to HTTPS"
fi
echo "HTTP redirects to HTTPS"

# TLS must be trusted and not expire within one day.
if ! openssl s_client -connect "$elastic_ip:443" -servername "$elastic_ip" -verify_return_error </dev/null >/dev/null 2>&1; then
    die "TLS certificate is not trusted"
fi
cert_pem=$(openssl s_client -connect "$elastic_ip:443" -servername "$elastic_ip" 2>/dev/null) || die "failed to fetch TLS certificate"
if ! printf '%s\n' "$cert_pem" | openssl x509 -checkend 86400 -noout >/dev/null 2>&1; then
    die "TLS certificate expires within one day"
fi
cert_issuer=$(printf '%s\n' "$cert_pem" | openssl x509 -noout -issuer)
echo "TLS issuer: $cert_issuer"

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
    local command=$1 response command_id status attempt
    response=$(aws ssm send-command \
        --region "$region" \
        --instance-ids "$instance_id" \
        --document-name AWS-RunShellScript \
        --parameters "$(jq -cn --arg command "$command" '{commands:[$command]}')" \
        --output json)
    command_id=$(jq -er '.Command.CommandId' <<<"$response")
    for ((attempt = 1; attempt <= 120; attempt++)); do
        response=$(aws ssm get-command-invocation \
            --region "$region" \
            --command-id "$command_id" \
            --instance-id "$instance_id" \
            --output json)
        status=$(jq -er '.Status' <<<"$response")
        case $status in
            Success)
                jq -r '.StandardOutputContent // ""' <<<"$response"
                return 0
                ;;
            Pending|InProgress|Delayed) sleep 5 ;;
            *)
                jq -r '.StandardErrorContent // "SSM command failed"' <<<"$response" >&2
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
health_command="cd /opt/caring-iggy && docker compose --env-file /etc/caring-iggy/deployment.env -f docker-compose.prod.yml ps -q | while read -r container; do [[ -n \$container ]] || continue; status=\$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' \"\$container\"); [[ \$status == healthy ]] || { echo \"unhealthy container: \$status\" >&2; exit 1; }; done; echo all-healthy"
ssm_run "$health_command" >/dev/null || die "compose health check failed"
echo "All containers healthy"

# Database role isolation is verified by init-databases.sh (idempotent, ends with verify_role).
echo "Checking per-database role isolation..."
ssm_run "bash /opt/caring-iggy/init-databases.sh" >/dev/null || die "database isolation check failed"
echo "Database role isolation verified"

# Reboot recovery: restart the host and confirm the stack comes back healthy.
echo "Checking reboot recovery..."
ssm_run "shutdown -r +0" >/dev/null || die "reboot command failed"
ssm_wait_online
ssm_run "$health_command" >/dev/null || die "health check after reboot failed"
echo "Reboot recovery verified"

# Bad-tag rollback: a non-existent image release must be undoable.
echo "Checking bad-tag rollback..."
if ssm_run "bash /opt/caring-iggy/deploy-on-host.sh release sha-000000000000" >/dev/null 2>&1; then
    die "bad-tag release unexpectedly succeeded"
fi
ssm_run "bash /opt/caring-iggy/deploy-on-host.sh rollback" >/dev/null || die "rollback command failed"
ssm_run "$health_command" >/dev/null || die "health check after rollback failed"
echo "Bad-tag rollback verified"

# PITR restore into a separately named temporary DB instance.
echo "Checking point-in-time restore..."
source_db_id=$(jq -r '.[0].DBInstanceIdentifier' <<<"$rds_info")
[[ -n $source_db_id && $source_db_id != null ]] || die "could not determine source RDS identifier"
timestamp=$(date -u +%Y%m%d%H%M%S)
target_db_id="${stack_name:0:40}-pitr-${timestamp}-$$"
# Trim if needed to stay within AWS 63-character limit.
target_db_id="${target_db_id:0:63}"

security_groups=()
while IFS= read -r sg; do
    [[ -n $sg ]] && security_groups+=("$sg")
done < <(jq -r '.[0].VpcSecurityGroups[]? .VpcSecurityGroupId' <<<"$rds_info")
db_subnet_group=$(jq -r '.[0].DBSubnetGroupName' <<<"$rds_info")
restore_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)

((${#security_groups[@]} > 0)) || die "could not determine RDS security groups"
[[ -n $db_subnet_group && $db_subnet_group != null ]] || die "could not determine RDS subnet group"

aws rds restore-db-instance-to-point-in-time \
    --region "$region" \
    --source-db-instance-identifier "$source_db_id" \
    --target-db-instance-identifier "$target_db_id" \
    --restore-time "$restore_time" \
    --no-publicly-accessible \
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

pit_verify_command="export AWS_REGION='$region'; secret=\$(aws secretsmanager get-secret-value --region '$region' --secret-id '$rds_secret_arn' --query SecretString --output text); user=\$(printf '%s' \"\$secret\" | jq -r '.username'); pass=\$(printf '%s' \"\$secret\" | jq -r '.password'); docker run --rm --network caring-iggy_backend -e PGUSER=\"\$user\" -e PGPASSWORD=\"\$pass\" -e PGSSLMODE=require postgres:15-alpine sh -ec 'psql -h $temp_endpoint -U \"\$PGUSER\" -d postgres -Atqc \"SELECT 1\" | grep -qx 1'"
ssm_run "$pit_verify_command" >/dev/null || die "temporary RDS verification failed"
echo "Point-in-time restore verified: $target_db_id ($temp_endpoint)"

# Cleanup checklist: nothing is deleted automatically; deletion protection stays enabled.
cat <<EOF

Cleanup checklist (manual):
- Review CloudFormation stack "$stack_name" (RDS deletion protection remains enabled)
- Delete the temporary RDS instance "$target_db_id" after review
- Empty the S3 artifact bucket "$artifact_bucket" only when decommissioning the stack
- Delete the CloudFormation stack separately when you are ready to create the final RDS snapshot
- No automated destroy command exists in this repository
EOF

echo "Disposable verification complete"
