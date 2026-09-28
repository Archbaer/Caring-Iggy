#!/usr/bin/env bash
set -euo pipefail

umask 077

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
template="$script_dir/template.yml"

usage() {
    cat >&2 <<'EOF'
Usage: deploy-aws.sh \
  --stack-name NAME \
  --stack-purpose production|disposable \
  --image-owner DOCKERHUB_OWNER \
  --image-tag sha-0123456789ab \
  --admin-email EMAIL \
  --region eu-west-2
EOF
}

die() {
    echo "deploy error: $1" >&2
    exit 1
}

stack_name=""
stack_purpose=""
image_owner=""
image_tag=""
admin_email=""
region=""

while (($#)); do
    case "$1" in
        --stack-name|--stack-purpose|--image-owner|--image-tag|--admin-email|--region)
            (($# >= 2)) || {
                usage
                exit 2
            }
            value=$2
            case "$1" in
                --stack-name) stack_name=$value ;;
                --stack-purpose) stack_purpose=$value ;;
                --image-owner) image_owner=$value ;;
                --image-tag) image_tag=$value ;;
                --admin-email) admin_email=$value ;;
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

[[ $stack_name =~ ^[A-Za-z][A-Za-z0-9-]{0,127}$ ]] || die "invalid or missing stack name"
[[ $stack_purpose == production || $stack_purpose == disposable ]] || die "stack purpose must be production or disposable"
[[ $image_owner =~ ^[a-z0-9]+([._-][a-z0-9]+)*$ ]] || die "invalid or missing DockerHub image owner"
[[ $image_tag =~ ^sha-[0-9a-f]{12}$ ]] || die "image tag must be sha- followed by 12 lowercase hexadecimal characters"
[[ $admin_email =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || die "invalid or missing administrator email"
[[ $region == eu-west-2 ]] || die "region must be eu-west-2"

for command in aws bash cfn-lint curl docker git jq openssl sha256sum shellcheck tar tr trivy; do
    command -v "$command" >/dev/null 2>&1 || die "required command is unavailable: $command"
done

[[ $(aws --version 2>&1) == aws-cli/2.* ]] || die "AWS CLI v2 is required"
openssl version >/dev/null 2>&1 || die "OpenSSL is unavailable"

compose_version=$(docker compose version --short 2>/dev/null | sed 's/^v//')
compose_major=${compose_version%%.*}
compose_rest=${compose_version#*.}
compose_minor=${compose_rest%%.*}
[[ $compose_major =~ ^[0-9]+$ && $compose_minor =~ ^[0-9]+$ ]] || die "unable to determine Docker Compose version"
if ((compose_major < 2 || (compose_major == 2 && compose_minor < 30))); then
    die "Docker Compose v2.30 or later is required"
fi

aws sts get-caller-identity --region "$region" >/dev/null || die "AWS authentication failed"

run_local_preflight() {
    local secret_scan="$script_dir/tests/secret-scan.test.sh"
    [[ -f $template ]] || die "CloudFormation template is missing"
    [[ -x $script_dir/tests/production-compose.test.sh ]] || die "production Compose test is missing"
    [[ -x $secret_scan ]] || die "tracked-secret scan is missing"

    bash -n "$script_dir"/*.sh
    shellcheck "$script_dir"/*.sh
    bash "$script_dir/tests/production-compose.test.sh"
    cfn-lint -r "$region" -t "$template"
    bash "$secret_scan"

    local service
    for service in animal-service adopter-service user-service matching-service reporting-service frontend; do
        trivy image --quiet --exit-code 1 --severity CRITICAL --ignore-unfixed \
            "$image_owner/caring-iggy-$service:$image_tag"
    done
    trivy image --quiet --exit-code 1 --severity CRITICAL --ignore-unfixed \
        caddy:2.11.4@sha256:040e9f7480b80b6d4a7e5013a21159b950a63dcbdb956e38abe2387fb28d9ec0
    trivy image --quiet --exit-code 1 --severity CRITICAL --ignore-unfixed \
        kong:3.9.3@sha256:d56dba2a916b7bb842ec0b5caae3e0956b18afc10119ea90203a41650c01f7c9
}

run_local_preflight

change_set_name="deploy-$(date +%s)-$$"
change_set_type=CREATE
stack_waiter=stack-create-complete
if aws cloudformation describe-stacks \
    --region "$region" \
    --stack-name "$stack_name" >/dev/null 2>&1; then
    change_set_type=UPDATE
    stack_waiter=stack-update-complete
fi

aws cloudformation create-change-set \
    --region "$region" \
    --stack-name "$stack_name" \
    --change-set-name "$change_set_name" \
    --change-set-type "$change_set_type" \
    --template-body "file://$template" \
    --capabilities CAPABILITY_IAM \
    --tags "Key=Purpose,Value=$stack_purpose" >/dev/null

change_set_file=$(mktemp)
stack_file=$(mktemp)
temp_dir=""
artifact_dir=""
artifact_bucket=""
artifact_key=""
artifact_uploaded=0
cleanup() {
    if ((artifact_uploaded)); then
        aws s3 rm "s3://$artifact_bucket/$artifact_key" --region "$region" --only-show-errors >/dev/null 2>&1 || true
    fi
    rm -f "$change_set_file" "$stack_file"
    if [[ -n $temp_dir ]]; then
        rm -rf "$temp_dir"
    fi
    if [[ -n $artifact_dir ]]; then
        rm -rf "$artifact_dir"
    fi
}
trap cleanup EXIT

if ! aws cloudformation wait change-set-create-complete \
    --region "$region" \
    --stack-name "$stack_name" \
    --change-set-name "$change_set_name"; then
    aws cloudformation describe-change-set \
        --region "$region" \
        --stack-name "$stack_name" \
        --change-set-name "$change_set_name" >"$change_set_file" || true
    if jq -er '.StatusReason // "" | test("didn.t contain changes|No updates"; "i")' \
        "$change_set_file" >/dev/null 2>&1; then
        echo "CloudFormation stack has no infrastructure changes"
    else
        die "CloudFormation change set creation failed"
    fi
else
    aws cloudformation describe-change-set \
        --region "$region" \
        --stack-name "$stack_name" \
        --change-set-name "$change_set_name" >"$change_set_file"

    if ! jq -e '
        [.Changes[]? | select(
          .ResourceChange.ResourceType == "AWS::RDS::DBInstance" and
          (.ResourceChange.Replacement == "True" or .ResourceChange.Replacement == "Conditional")
        )] | length == 0
    ' "$change_set_file" >/dev/null; then
        die "change set would replace RDS"
    fi

    if ! jq -e '
        [.Changes[]? | select(
          .ResourceChange.ResourceType == "AWS::EC2::SecurityGroupIngress" and
          .ResourceChange.LogicalResourceId != "DatabaseSecurityGroupIngress"
        )] | length == 0
    ' "$change_set_file" >/dev/null; then
        die "change set contains an unexpected security-group ingress resource"
    fi

    aws cloudformation execute-change-set \
        --region "$region" \
        --stack-name "$stack_name" \
        --change-set-name "$change_set_name"
    aws cloudformation wait "$stack_waiter" \
        --region "$region" \
        --stack-name "$stack_name"
fi

aws cloudformation describe-stacks \
    --region "$region" \
    --stack-name "$stack_name" >"$stack_file"

output_value() {
    local key=$1
    jq -er --arg key "$key" '
      .Stacks[0].Outputs[] | select(.OutputKey == $key) | .OutputValue
    ' "$stack_file"
}

app_secret_arn=$(output_value AppSecretArn)
rds_secret_arn=$(output_value RdsSecretArn)
artifact_bucket=$(output_value ArtifactBucketName)
instance_id=$(output_value InstanceId)
elastic_ip=$(output_value ElasticIp)
rds_endpoint=$(output_value RdsEndpoint)
output_value InstanceProfileArn >/dev/null
output_value StackName >/dev/null

secret_arn_pattern="^arn:aws:secretsmanager:$region:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$"
[[ $app_secret_arn =~ $secret_arn_pattern ]] || die "stack returned an invalid application secret ARN"
[[ $rds_secret_arn =~ $secret_arn_pattern ]] || die "stack returned an invalid RDS secret ARN"

secret_versions_file=$(mktemp)
aws secretsmanager list-secret-version-ids \
    --region "$region" \
    --secret-id "$app_secret_arn" >"$secret_versions_file"
current_version_count=$(jq '[.Versions[]? | select(.VersionStages | index("AWSCURRENT"))] | length' "$secret_versions_file")
rm -f "$secret_versions_file"

if [[ $current_version_count == 0 ]]; then
    temp_dir=$(mktemp -d)
    chmod 700 "$temp_dir"
    private_key_file="$temp_dir/private-key.pem"
    public_key_file="$temp_dir/public-key.pem"
    secret_file="$temp_dir/application-secret.json"

    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
        -out "$private_key_file" 2>/dev/null
    openssl pkey -in "$private_key_file" -pubout -out "$public_key_file" 2>/dev/null
    chmod 600 "$private_key_file" "$public_key_file"

    export SECRET_JWT_PRIVATE_KEY_BASE64
    export SECRET_JWT_PUBLIC_KEY_BASE64
    export SECRET_SESSION_HEX
    export SECRET_CSRF_HEX
    export SECRET_ANIMALS_PASSWORD_HEX
    export SECRET_USERS_PASSWORD_HEX
    export SECRET_ADOPTERS_PASSWORD_HEX
    export SECRET_ADMIN_PASSWORD_HEX
    export SECRET_ADMIN_EMAIL=$admin_email
    SECRET_JWT_PRIVATE_KEY_BASE64=$(base64 <"$private_key_file" | tr -d '\n')
    SECRET_JWT_PUBLIC_KEY_BASE64=$(base64 <"$public_key_file" | tr -d '\n')
    SECRET_SESSION_HEX=$(openssl rand -hex 32)
    SECRET_CSRF_HEX=$(openssl rand -hex 32)
    SECRET_ANIMALS_PASSWORD_HEX=$(openssl rand -hex 32)
    SECRET_USERS_PASSWORD_HEX=$(openssl rand -hex 32)
    SECRET_ADOPTERS_PASSWORD_HEX=$(openssl rand -hex 32)
    SECRET_ADMIN_PASSWORD_HEX=$(openssl rand -hex 32)

    jq -n '{
      jwt: {
        privateKeyBase64: env.SECRET_JWT_PRIVATE_KEY_BASE64,
        publicKeyBase64: env.SECRET_JWT_PUBLIC_KEY_BASE64,
        keyId: "ci-key-1"
      },
      frontend: {
        sessionSecretHex: env.SECRET_SESSION_HEX,
        csrfSecretHex: env.SECRET_CSRF_HEX
      },
      databases: {
        animals: {username: "animals_app", passwordHex: env.SECRET_ANIMALS_PASSWORD_HEX},
        users: {username: "users_app", passwordHex: env.SECRET_USERS_PASSWORD_HEX},
        adopters: {username: "adopters_app", passwordHex: env.SECRET_ADOPTERS_PASSWORD_HEX}
      },
      initialAdmin: {
        email: env.SECRET_ADMIN_EMAIL,
        passwordHex: env.SECRET_ADMIN_PASSWORD_HEX
      }
    }' >"$secret_file"
    chmod 600 "$secret_file"

    unset \
        SECRET_JWT_PRIVATE_KEY_BASE64 SECRET_JWT_PUBLIC_KEY_BASE64 \
        SECRET_SESSION_HEX SECRET_CSRF_HEX \
        SECRET_ANIMALS_PASSWORD_HEX SECRET_USERS_PASSWORD_HEX \
        SECRET_ADOPTERS_PASSWORD_HEX SECRET_ADMIN_PASSWORD_HEX SECRET_ADMIN_EMAIL

    aws secretsmanager put-secret-value \
        --region "$region" \
        --secret-id "$app_secret_arn" \
        --secret-string "file://$secret_file" >/dev/null
    echo "application secret initialized"
elif [[ $current_version_count == 1 ]]; then
    existing_secret_response="$change_set_file"
    existing_secret_file="$stack_file"
    aws secretsmanager get-secret-value \
        --region "$region" \
        --secret-id "$app_secret_arn" >"$existing_secret_response"
    jq -er '.SecretString' "$existing_secret_response" >"$existing_secret_file"
    existing_admin_email=$(jq -er '.initialAdmin.email' "$existing_secret_file")
    [[ $existing_admin_email == "$admin_email" ]] || die "administrator email does not match the existing application secret"
    echo "existing application secret verified"
else
    die "application secret has multiple AWSCURRENT versions"
fi

runtime_files=(
    infrastructure/aws/Caddyfile.template
    infrastructure/aws/kong.prod.yml.template
    infrastructure/aws/docker-compose.prod.yml
    infrastructure/aws/prepare-runtime.sh
    infrastructure/aws/init-databases.sh
    infrastructure/aws/bootstrap-admin.sh
    infrastructure/aws/start-stack.sh
    infrastructure/aws/deploy-on-host.sh
    infrastructure/aws/caring-iggy.service
)
repo_root=$(cd "$script_dir/../.." && pwd)
for file in "${runtime_files[@]}"; do
    git -C "$repo_root" ls-files --error-unmatch -- "$file" >/dev/null 2>&1 || die "runtime artifact input is not tracked: $file"
done
if [[ -n $(git -C "$repo_root" status --porcelain -- "${runtime_files[@]}") ]]; then
    die "runtime artifact inputs have uncommitted changes"
fi

[[ $artifact_bucket =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ && $artifact_bucket != *..* ]] || die "stack returned an invalid artifact bucket"
[[ $instance_id =~ ^i-[0-9a-f]{17}$ ]] || die "stack returned an invalid instance ID"
[[ $elastic_ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || die "stack returned an invalid Elastic IP"
[[ $rds_endpoint =~ ^[A-Za-z0-9.-]+$ ]] || die "stack returned an invalid RDS endpoint"

artifact_dir=$(mktemp -d)
archive="$artifact_dir/release.tar"
git -C "$repo_root" archive --format=tar -o "$archive" HEAD -- "${runtime_files[@]}"
archive_sha256=$(sha256sum "$archive" | awk '{print $1}')
[[ $archive_sha256 =~ ^[0-9a-f]{64}$ ]] || die "failed to calculate release archive digest"
artifact_key="deployments/$stack_name/$(date -u +%Y%m%dT%H%M%SZ)-$(openssl rand -hex 16).tar"
artifact_uploaded=1
aws s3 cp "$archive" "s3://$artifact_bucket/$artifact_key" \
    --region "$region" --only-show-errors

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
previous_image_tag=$(ssm_run 'if [[ -f /etc/caring-iggy/current-image-tag ]]; then cat /etc/caring-iggy/current-image-tag; fi') || die "failed to read current host release"
previous_image_tag=${previous_image_tag//$'\n'/}
if [[ -n $previous_image_tag && ! $previous_image_tag =~ ^sha-[0-9a-f]{12}$ ]]; then
    die "host returned an invalid current image tag"
fi

app_origin="https://$elastic_ip"
docker_image_prefix="$image_owner/caring-iggy"
bootstrap_file="$artifact_dir/bootstrap.sh"
cat >"$bootstrap_file" <<EOF
set -euo pipefail
bucket='$artifact_bucket'
key='$artifact_key'
checksum='$archive_sha256'
tag='$image_tag'
[[ \$bucket =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]\$ && \$bucket != *..* ]]
[[ \$key =~ ^deployments/[A-Za-z0-9._/-]+\$ && \$key != *..* ]]
[[ \$checksum =~ ^[0-9a-f]{64}\$ ]]
work=\$(mktemp -d)
chmod 700 "\$work"
trap 'rm -rf "\$work"' EXIT
aws s3 cp "s3://\$bucket/\$key" "\$work/release.tar" --region '$region' --only-show-errors
printf '%s  %s\n' "\$checksum" "\$work/release.tar" | sha256sum -c -
while IFS= read -r member; do
  [[ \$member != /* && \$member != *'../'* && \$member != '../'* ]]
  case "\$member" in
    infrastructure/|infrastructure/aws/|infrastructure/aws/Caddyfile.template|infrastructure/aws/kong.prod.yml.template|infrastructure/aws/docker-compose.prod.yml|infrastructure/aws/prepare-runtime.sh|infrastructure/aws/init-databases.sh|infrastructure/aws/bootstrap-admin.sh|infrastructure/aws/start-stack.sh|infrastructure/aws/deploy-on-host.sh|infrastructure/aws/caring-iggy.service) ;;
    *) echo 'archive contains a non-allowlisted member' >&2; exit 1 ;;
  esac
done < <(tar -tf "\$work/release.tar")
if tar -tvf "\$work/release.tar" | awk 'substr(\$1,1,1) !~ /[-d]/ {exit 1}'; then :; else echo 'archive contains an unsafe member type' >&2; exit 1; fi
tar -xf "\$work/release.tar" -C "\$work"
export AWS_REGION='$region'
export APP_SECRET_ARN='$app_secret_arn'
export RDS_SECRET_ARN='$rds_secret_arn'
export RDS_ENDPOINT='$rds_endpoint'
export DOCKER_IMAGE_PREFIX='$docker_image_prefix'
export APP_ORIGIN='$app_origin'
bash "\$work/infrastructure/aws/deploy-on-host.sh" install "\$work/infrastructure/aws"
bash /opt/caring-iggy/deploy-on-host.sh release "\$tag"
EOF
bootstrap_command=$(<"$bootstrap_file")

rollback_command='bash /opt/caring-iggy/deploy-on-host.sh rollback'
if ! ssm_run "$bootstrap_command"; then
    ssm_run "$rollback_command" >/dev/null 2>&1 || true
    die "host candidate release failed"
fi

if ! curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 30 "$app_origin/" >/dev/null || \
    ! openssl s_client -connect "$elastic_ip:443" -servername "$elastic_ip" </dev/null 2>/dev/null | \
        openssl x509 -checkend 3600 -noout >/dev/null; then
    ssm_run "$rollback_command" >/dev/null 2>&1 || true
    die "public HTTPS verification failed; previous release restored when available"
fi

if ! ssm_run "bash /opt/caring-iggy/deploy-on-host.sh promote '$image_tag'"; then
    ssm_run "$rollback_command" >/dev/null 2>&1 || true
    die "candidate promotion failed; previous release restored when available"
fi

cat <<EOF
AWS deployment complete
Stack: $stack_name
Elastic IP: $elastic_ip
HTTPS URL: $app_origin/
Successful image tag: $image_tag
Application secret ARN: $app_secret_arn
Administrator email field: initialAdmin.email
Retrieve initial password: aws secretsmanager get-secret-value --region $region --secret-id '$app_secret_arn' --query SecretString --output text | jq -r '.initialAdmin.passwordHex'
Rollback: aws ssm send-command --region $region --instance-ids '$instance_id' --document-name AWS-RunShellScript --parameters 'commands=["$rollback_command"]'
EOF
