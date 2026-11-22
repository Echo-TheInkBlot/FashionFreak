#!/usr/bin/env bash
# Runs the migration, seed and SQL tests against a throwaway database on any Postgres 15+.
# Usage: PGURL=postgres://postgres@localhost:5432 npm run test:db
set -euo pipefail
cd "$(dirname "$0")/../.."
PGURL="${PGURL:-postgres://postgres@localhost:5432}"
psql "$PGURL/postgres" -q -c "drop database if exists ff_test" -c "create database ff_test"
for f in supabase/tests/supabase-shim.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/inventory.test.sql; do
  if ! out=$(psql "$PGURL/ff_test" -q -v ON_ERROR_STOP=1 -f "$f" 2>&1); then
    echo "$out"; echo "FAILED in $f"; exit 1
  fi
  echo "$out" | grep -v -e wal_level -e 'HINT:' || true
done
