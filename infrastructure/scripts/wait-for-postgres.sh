#!/bin/sh
# Usage: wait-for-postgres.sh <host> -- <command...>
set -e

host="$1"
shift

if [ "$1" = "--" ]; then
  shift
fi

until PGPASSWORD="$DATABASE_PASSWORD" psql -h "$host" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c '\q' >/dev/null 2>&1; do
  echo "Aguardando PostgreSQL em $host..."
  sleep 1
done

echo "PostgreSQL disponível em $host."
exec "$@"
