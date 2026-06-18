#!/usr/bin/env bash
# 备份 works-portal + AiForKids 共用的 PostgreSQL（容器 aiforkids-postgres）
# 用法：./scripts/backup-db.sh [输出目录]
set -euo pipefail

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUT_DIR/learningai-$STAMP.sql.gz"

echo "[backup] 导出 learningai → $FILE"
docker exec aiforkids-postgres pg_dump -U learningai learningai | gzip > "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[backup] 完成: $FILE ($SIZE)"
