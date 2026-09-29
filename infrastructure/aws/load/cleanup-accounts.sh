#!/usr/bin/env bash
# Sent through SSM only after the caller rechecks Purpose=disposable.
set +x
set -euo pipefail
[[ ${CI_LOAD_TEST:-} == true && ${LOAD_STACK_PURPOSE:-} == disposable ]] || exit 1
[[ ${LOAD_PREFIX:-} =~ ^load-[0-9]+-[0-9a-f]{16}$ ]] || exit 1
[[ $LOAD_ADOPTER_EMAIL == "$LOAD_PREFIX-adopter@example.org" && $LOAD_STAFF_EMAIL == "$LOAD_PREFIX-staff@example.org" ]] || exit 1
[[ ${LOAD_DB_HOST:-} =~ ^[A-Za-z0-9.-]+$ ]] || exit 1
for id in "$LOAD_ADOPTER_ACCOUNT" "$LOAD_ADOPTER_PROFILE" "$LOAD_STAFF_ACCOUNT" "$LOAD_STAFF_PROFILE"; do
    [[ -z $id || $id =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || exit 1
done
export LOAD_PREFIX LOAD_ADOPTER_EMAIL LOAD_STAFF_EMAIL LOAD_ADOPTER_ACCOUNT LOAD_ADOPTER_PROFILE LOAD_STAFF_ACCOUNT LOAD_STAFF_PROFILE
image=postgres:15-alpine@sha256:25d430274d8a31184f9435cc5b2f56aff254952065bbbcac0c51acedb5a1d1e7
database() {
    local service=$1 database_name=$2
    docker run --rm -i --network caring-iggy_backend \
        --env-file "/run/caring-iggy/$service.env" \
        -e PGHOST="$LOAD_DB_HOST" -e PGSSLMODE=require \
        "$image" sh -ec 'export PGUSER="$DB_USERNAME" PGPASSWORD="$DB_PASSWORD"; exec psql -X -v ON_ERROR_STOP=1 -At -d "$1"' sh "$database_name"
}
# Obtain the exact UUID only from the uniquely generated identity, never a prefix scan.
profile=$(database user-service users_db <<SQL
SELECT profile_id FROM accounts WHERE email = '$LOAD_ADOPTER_EMAIL'
AND role = 'ADOPTER' AND profile_type = 'ADOPTER'
AND ('$LOAD_ADOPTER_ACCOUNT' = '' OR id = NULLIF('$LOAD_ADOPTER_ACCOUNT', '')::uuid)
AND ('$LOAD_ADOPTER_PROFILE' = '' OR profile_id = NULLIF('$LOAD_ADOPTER_PROFILE', '')::uuid);
SQL
)
profile=${profile:-$LOAD_ADOPTER_PROFILE}
if [[ -n $profile ]]; then
    [[ $profile =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || exit 1
    database adopter-service adopters_db <<SQL
BEGIN;
DELETE FROM adopters WHERE id = '$profile'::uuid AND email = '$LOAD_ADOPTER_EMAIL';
SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM adopters WHERE id = '$profile'::uuid) THEN 0 ELSE 1 END;
COMMIT;
SQL
fi
database user-service users_db <<SQL
BEGIN;
DELETE FROM accounts WHERE email = '$LOAD_ADOPTER_EMAIL' AND role = 'ADOPTER' AND profile_type = 'ADOPTER'
AND ('$LOAD_ADOPTER_ACCOUNT' = '' OR id = NULLIF('$LOAD_ADOPTER_ACCOUNT', '')::uuid)
AND ('$LOAD_ADOPTER_PROFILE' = '' OR profile_id = NULLIF('$LOAD_ADOPTER_PROFILE', '')::uuid);
DELETE FROM accounts WHERE email = '$LOAD_STAFF_EMAIL' AND role = 'STAFF' AND profile_type = 'EMPLOYEE'
AND ('$LOAD_STAFF_ACCOUNT' = '' OR id = NULLIF('$LOAD_STAFF_ACCOUNT', '')::uuid)
AND ('$LOAD_STAFF_PROFILE' = '' OR profile_id = NULLIF('$LOAD_STAFF_PROFILE', '')::uuid)
AND NOT EXISTS (SELECT 1 FROM employees WHERE employees.id = accounts.profile_id);
SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM accounts WHERE email IN ('$LOAD_ADOPTER_EMAIL', '$LOAD_STAFF_EMAIL')) THEN 0 ELSE 1 END;
COMMIT;
SQL
# sessions and adoption_history cascade from their parent records.
