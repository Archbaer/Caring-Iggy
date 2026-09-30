#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
script="$repo_root/infrastructure/aws/tests/migration-data.test.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf "$fixture_dir"' EXIT

clean_root="$fixture_dir/clean"
for root in "$clean_root" "$fixture_dir/forbidden"; do
    mkdir -p "$root/backend/service/src/main/resources/db/migration"
done
printf 'CREATE TABLE animals (id bigint primary key);\n' \
    >"$clean_root/backend/service/src/main/resources/db/migration/V1__animals.sql"
printf 'INSERT INTO animals (id) VALUES (1);\n' \
    >"$fixture_dir/forbidden/backend/service/src/main/resources/db/migration/V1__demo.sql"

if forbidden_output=$(MIGRATION_ROOT="$fixture_dir/forbidden" bash "$script" 2>&1); then
    echo "migration data check accepted a forbidden INSERT" >&2
    exit 1
fi
case "$forbidden_output" in
    *"demo identities or animals found in production migrations"*) ;;
    *)
        echo "migration data check rejected forbidden fixture for wrong reason" >&2
        exit 1
        ;;
esac

bin_dir="$fixture_dir/bin"
mkdir -p "$bin_dir"
for tool in grep rg; do
    cat >"$bin_dir/$tool" <<'EOF'
#!/usr/bin/env bash
exit 127
EOF
    chmod +x "$bin_dir/$tool"
done

if missing_tool_output=$(PATH="$bin_dir:$PATH" MIGRATION_ROOT="$clean_root" bash "$script" 2>&1); then
    echo "migration data check passed when search tools were unavailable" >&2
    exit 1
fi
case "$missing_tool_output" in
    *"unable to scan production migrations"*) ;;
    *)
        echo "migration data check rejected missing search tool for wrong reason" >&2
        exit 1
        ;;
esac

echo "migration data failure handling contract: PASS"
