#!/usr/bin/env bash
set -euo pipefail

umask 077

if ((EUID != 0)) && [[ ${ALLOW_NON_ROOT_TEST:-0} != 1 ]]; then
    echo "deploy-on-host must run as root" >&2
    exit 1
fi

install_dir=${INSTALL_DIR:-/opt/caring-iggy}
config_dir=${CONFIG_DIR:-/etc/caring-iggy}
runtime_dir=${RUNTIME_DIR:-/run/caring-iggy}
systemd_dir=${SYSTEMD_DIR:-/etc/systemd/system}
deployment_env="$config_dir/deployment.env"
compose_file="$install_dir/docker-compose.prod.yml"
current_tag="$config_dir/current-image-tag"
previous_tag="$config_dir/previous-image-tag"
candidate_tag="$config_dir/candidate-image-tag"
ready_tag="$config_dir/candidate-ready"

runtime_files=(
    Caddyfile.template
    kong.prod.yml.template
    docker-compose.prod.yml
    prepare-runtime.sh
    init-databases.sh
    bootstrap-admin.sh
    start-stack.sh
    deploy-on-host.sh
    caring-iggy.service
)
services=(caddy kong animal-service adopter-service user-service matching-service reporting-service frontend)

die() {
    echo "host deploy error: $1" >&2
    exit 1
}

validate_tag() {
    [[ $1 =~ ^sha-[0-9a-f]{12}$ ]] || die "invalid immutable image tag"
}

atomic_write() {
    local target=$1 value=$2 temporary
    temporary="$target.new.$$"
    printf '%s\n' "$value" >"$temporary"
    chmod 600 "$temporary"
    mv -f "$temporary" "$target"
}

load_environment() {
    [[ -f $deployment_env ]] || die "deployment environment is unavailable"
    set -a
    # shellcheck disable=SC1090
    source "$deployment_env"
    set +a
    export RUNTIME_DIR="$runtime_dir"
}

compose() {
    docker compose --env-file "$deployment_env" -f "$compose_file" "$@"
}

install_release_files() {
    local source_dir=$1 entry name staging backup unit_temp
    [[ -d $source_dir ]] || die "release source directory is unavailable"

    for entry in "$source_dir"/*; do
        [[ -f $entry && ! -L $entry ]] || die "release contains an invalid member"
        name=$(basename "$entry")
        case " ${runtime_files[*]} " in
            *" $name "*) ;;
            *) die "release contains a non-allowlisted file" ;;
        esac
    done
    for name in "${runtime_files[@]}"; do
        [[ -f $source_dir/$name && ! -L $source_dir/$name ]] || die "release is missing $name"
    done

    : "${AWS_REGION:?AWS_REGION is required}"
    : "${APP_SECRET_ARN:?APP_SECRET_ARN is required}"
    : "${RDS_SECRET_ARN:?RDS_SECRET_ARN is required}"
    : "${RDS_ENDPOINT:?RDS_ENDPOINT is required}"
    : "${DOCKER_IMAGE_PREFIX:?DOCKER_IMAGE_PREFIX is required}"
    : "${APP_ORIGIN:?APP_ORIGIN is required}"

    mkdir -p "$(dirname "$install_dir")" "$config_dir" "$systemd_dir"
    chmod 700 "$config_dir"
    staging="$install_dir.new.$$"
    backup="$install_dir.old.$$"
    rm -rf "$staging"
    mkdir -m 755 "$staging"
    for name in "${runtime_files[@]}"; do
        install -m 644 "$source_dir/$name" "$staging/$name"
    done
    chmod 755 "$staging/"*.sh

    if [[ -e $install_dir ]]; then
        mv "$install_dir" "$backup"
    fi
    if ! mv "$staging" "$install_dir"; then
        [[ -e $backup ]] && mv "$backup" "$install_dir"
        die "atomic release installation failed"
    fi
    rm -rf "$backup"

    unit_temp="$systemd_dir/caring-iggy.service.new.$$"
    install -m 644 "$install_dir/caring-iggy.service" "$unit_temp"
    mv -f "$unit_temp" "$systemd_dir/caring-iggy.service"
    {
        printf 'AWS_REGION=%s\n' "$AWS_REGION"
        printf 'APP_SECRET_ARN=%s\n' "$APP_SECRET_ARN"
        printf 'RDS_SECRET_ARN=%s\n' "$RDS_SECRET_ARN"
        printf 'RDS_ENDPOINT=%s\n' "$RDS_ENDPOINT"
        printf 'DOCKER_IMAGE_PREFIX=%s\n' "$DOCKER_IMAGE_PREFIX"
        printf 'APP_ORIGIN=%s\n' "$APP_ORIGIN"
        printf 'RUNTIME_DIR=%s\n' "$runtime_dir"
    } >"$deployment_env.new.$$"
    chmod 600 "$deployment_env.new.$$"
    mv -f "$deployment_env.new.$$" "$deployment_env"
    systemctl daemon-reload
    systemctl enable caring-iggy.service
    echo "host release files installed"
}

release_candidate() {
    local tag=$1 service container health
    validate_tag "$tag"
    load_environment
    if [[ -f $current_tag ]]; then
        read -r service <"$current_tag"
        validate_tag "$service"
        atomic_write "$previous_tag" "$service"
    else
        rm -f "$previous_tag"
    fi
    atomic_write "$candidate_tag" "$tag"
    rm -f "$ready_tag"
    export IMAGE_TAG=$tag
    "$install_dir/prepare-runtime.sh"
    "$install_dir/init-databases.sh"
    compose pull
    compose up -d --wait
    for service in "${services[@]}"; do
        container=$(compose ps -q "$service")
        [[ -n $container ]] || die "service container is absent: $service"
        health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")
        [[ $health == healthy ]] || die "service is not healthy: $service"
    done
    "$install_dir/bootstrap-admin.sh"
    atomic_write "$ready_tag" "$tag"
    echo "candidate release ready: $tag"
}

promote_candidate() {
    local tag=$1 candidate ready
    validate_tag "$tag"
    [[ -f $candidate_tag && -f $ready_tag ]] || die "candidate is not ready"
    read -r candidate <"$candidate_tag"
    read -r ready <"$ready_tag"
    [[ $candidate == "$tag" && $ready == "$tag" ]] || die "ready candidate does not match requested tag"
    atomic_write "$current_tag" "$tag"
    rm -f "$candidate_tag" "$ready_tag"
    echo "candidate promoted: $tag"
}

rollback_release() {
    local tag
    rm -f "$ready_tag"
    if [[ ! -f $previous_tag ]]; then
        rm -f "$candidate_tag"
        echo "rollback unavailable: no previous successful release" >&2
        return 2
    fi
    read -r tag <"$previous_tag"
    validate_tag "$tag"
    load_environment
    export IMAGE_TAG=$tag
    compose pull
    compose up -d --wait
    atomic_write "$current_tag" "$tag"
    rm -f "$candidate_tag"
    echo "release restored: $tag"
}

case ${1:-} in
    install)
        (($# == 2)) || die "usage: deploy-on-host.sh install SOURCE_DIR"
        install_release_files "$2"
        ;;
    release)
        (($# == 2)) || die "usage: deploy-on-host.sh release TAG"
        release_candidate "$2"
        ;;
    promote)
        (($# == 2)) || die "usage: deploy-on-host.sh promote TAG"
        promote_candidate "$2"
        ;;
    rollback)
        (($# == 1)) || die "usage: deploy-on-host.sh rollback"
        rollback_release
        ;;
    *) die "usage: deploy-on-host.sh install SOURCE_DIR | release TAG | promote TAG | rollback" ;;
esac
