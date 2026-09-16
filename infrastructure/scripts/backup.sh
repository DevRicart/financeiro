#!/bin/sh
# Uso: backup.sh [daily|weekly|monthly]
# Sugestão de crontab (na VPS):
#   0 3 * * *   /path/to/financeiro/infrastructure/scripts/backup.sh daily    # mantém 7
#   0 4 * * 0   /path/to/financeiro/infrastructure/scripts/backup.sh weekly   # mantém 4
#   0 5 1 * *   /path/to/financeiro/infrastructure/scripts/backup.sh monthly  # mantém 6
set -e

PERIOD="${1:-daily}"
case "$PERIOD" in
  daily)   KEEP=7  ;;
  weekly)  KEEP=4  ;;
  monthly) KEEP=6  ;;
  *) echo "Uso: $0 [daily|weekly|monthly]"; exit 1 ;;
esac

cd "$(dirname "$0")/../.."
BACKUP_DIR="infrastructure/backups/$PERIOD"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/financeiro_${TIMESTAMP}.sql.gz"

echo "Gerando backup ($PERIOD): $FILE"
docker compose -f docker-compose.prod.yml exec -T database \
  pg_dump -U "$DATABASE_USER" "$DATABASE_NAME" | gzip > "$FILE"

echo "Aplicando retenção: mantendo os $KEEP mais recentes."
ls -1t "$BACKUP_DIR"/financeiro_*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm --

echo "Backup concluído."
