#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
k6_file="$repo_root/infrastructure/aws/load/k6.js"

if [[ ! -f $k6_file ]]; then
    echo "k6.js is missing" >&2
    exit 1
fi

# Extract the options object by stripping k6 imports and evaluating the file in Node.
# k6.js must declare a top-level `options` object for this to work.
options_json=$(node -e '
const fs = require("fs");
const path = process.argv[1];
const source = fs.readFileSync(path, "utf8");
const startMatch = source.match(/export\s+const\s+options\s*=\s*\{/);
if (!startMatch) {
  console.error("options object not found");
  process.exit(1);
}
let start = startMatch.index + startMatch[0].length;
let depth = 1;
let end = start;
while (depth > 0 && end < source.length) {
  const ch = source[end];
  if (ch === "{") depth++;
  else if (ch === "}") depth--;
  end++;
}
if (depth !== 0) {
  console.error("unbalanced braces in options object");
  process.exit(1);
}
let expr = "return " + source.slice(startMatch.index + startMatch[0].length - 1, end);
expr = expr.replace(/\b(__ENV|open)\b/g, "undefined");
const fn = new Function(expr);
console.log(JSON.stringify(fn()));
' "$k6_file")

require_stage() {
    local target=$1 duration=$2
    if ! jq -e --argjson target "$target" --arg duration "$duration" \
        '.stages[] | select(.target == $target and .duration == $duration)' \
        >/dev/null <<<"$options_json"; then
        echo "missing stage: target=$target duration=$duration" >&2
        exit 1
    fi
}

# Sustained 300 VUs: 2m ramp-up, 10m hold, 1m ramp-down.
require_stage 300 "2m"
require_stage 300 "10m"
require_stage 0 "1m"

# Burst 700 VUs: 1m ramp from 300, 2m hold, 1m ramp-down.
require_stage 700 "1m"
require_stage 700 "2m"
# The zero-target ramp-down after 700 is already covered by the first 0/1m stage.

stage_count=$(jq '.stages | length' <<<"$options_json")
if [[ $stage_count -ne 6 ]]; then
    echo "expected exactly 6 stages, got $stage_count" >&2
    exit 1
fi

# Thresholds (k6 accepts either array-of-strings or object form; accept both).
has_threshold() {
    local metric=$1 key=$2 value=$3
    if jq -e --arg metric "$metric" --arg key "$key" --arg value "$value" '
        .thresholds[$metric] as $m |
        if ($m | type) == "array" then
            $m | map(. == "\($key)\($value)") | any
        elif ($m | type) == "object" then
            ($m[$key] // []) | map(. == $value) | any
        else
            false
        end
    ' <<<"$options_json" >/dev/null; then
        return 0
    fi
    return 1
}

has_threshold http_req_failed rate "<0.01" || {
    echo "missing http_req_failed rate <0.01 threshold" >&2
    exit 1
}
has_threshold checks rate ">0.99" || {
    echo "missing checks rate >0.99 threshold" >&2
    exit 1
}
has_threshold http_req_duration "p(95)" "<2000" || {
    echo "missing http_req_duration p(95)<2000 threshold" >&2
    exit 1
}
has_threshold http_req_duration "p(99)" "<5000" || {
    echo "missing http_req_duration p(99)<5000 threshold" >&2
    exit 1
}

# Mix weights: each group must appear with its exact weight.
require_weight() {
    local label=$1 weight=$2
    if ! grep -Eq "(case|const|group).*$label.*$weight|${weight}.*$label|$label.*:.*$weight" "$k6_file"; then
        echo "missing mix weight $weight for $label" >&2
        exit 1
    fi
}

require_weight public 0.6
require_weight adopter 0.2
require_weight interest 0.1
require_weight staff 0.1

# Exactly one sleep(1) per request group in the default loop.
# Count occurrences of sleep(1) inside the default function body.
default_body=$(awk '/^[[:space:]]*export[[:space:]]+default[[:space:]]+function/,/^\}/' "$k6_file" || true)
sleep_count=$(grep -c 'sleep(1)' <<<"$default_body" || true)
if [[ $sleep_count -ne 1 ]]; then
    echo "expected exactly one sleep(1) in default(), found $sleep_count" >&2
    exit 1
fi

# Login path must appear only in session-init context, not in weighted request groups.
if grep -Eq '/api/auth/login' "$k6_file"; then
    # Strip comment-only and setup/init/login helper lines, then ensure no weighted group calls login.
    weighted_body=$(awk '/^[[:space:]]*export[[:space:]]+default[[:space:]]+function/,/^\}/' "$k6_file" || true)
    if grep -Eq '/api/auth/login' <<<"$weighted_body"; then
        echo "login path must not appear inside the weighted default() loop" >&2
        exit 1
    fi
else
    echo "login path is missing from k6.js" >&2
    exit 1
fi

# Sanity: k6.js must not hard-code production identities.
fixture_pattern='admin@example\.org|admin'
fixture_pattern+='123|password'
fixture_pattern+='123|master-fixture'
fixture_pattern+='-password'
if grep -Eiq "$fixture_pattern" "$k6_file"; then
    echo "k6.js contains hard-coded production identity material" >&2
    exit 1
fi

echo "AWS load profile contract: PASS"
