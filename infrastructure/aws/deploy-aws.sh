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

for command in aws bash cfn-lint docker jq openssl shellcheck tr trivy; do
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
cleanup() {
    rm -f "$change_set_file" "$stack_file"
    if [[ -n $temp_dir ]]; then
        rm -rf "$temp_dir"
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
output_value RdsSecretArn >/dev/null
output_value ArtifactBucketName >/dev/null
output_value InstanceId >/dev/null
output_value ElasticIp >/dev/null
output_value RdsEndpoint >/dev/null
output_value InstanceProfileArn >/dev/null
output_value StackName >/dev/null

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

echo "AWS infrastructure and application secret are ready"
