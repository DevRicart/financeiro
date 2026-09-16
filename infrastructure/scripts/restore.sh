#!/bin/sh
# Uso: restore.sh caminho/para/backup.sql.gz
set -e

FILE="$1"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: $0 caminho/para/backup.sql.gz"
  exit 1
fi

cd "$(dirname "$0")/../.."

echo "ATENÇÃO: isso substitui todos os dados atuais do banco '$DATABASE_NAME'."
printf "Digite 'sim' para confirmar: "
read -r CONFIRM
if [ "$CONFIRM" != "sim" ]; then
  echo "Cancelado."
  exit 1
fi

gunzip -c "$FILE" | docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$DATABASE_USER" "$DATABASE_NAME"

echo "Restauração concluída."
