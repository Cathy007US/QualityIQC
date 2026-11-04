#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found" >&2
  exit 1
fi

mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"

read -r DB_USER DB_PASS DB_HOST DB_PORT DB_NAME <<< "$(
python3 - <<'PY'
import urllib.parse
url = ''
for line in open('.env', encoding='utf-8'):
    if line.startswith('DATABASE_URL='):
        url = line.split('=', 1)[1].strip()
        break
parsed = urllib.parse.urlparse(url)
print(
    urllib.parse.unquote(parsed.username or 'iqc'),
    urllib.parse.unquote(parsed.password or ''),
    parsed.hostname or 'db',
    parsed.port or 5432,
    (parsed.path or '/iqc_insp').lstrip('/'),
)
PY
)"

UPLOAD_VOLUME="$(grep -E '^UPLOAD_VOLUME=' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)"
UPLOAD_VOLUME="${UPLOAD_VOLUME:-iqc-insp_iqc_uploads}"

DB_DUMP="backups/iqc_insp-${STAMP}.dump"
UPLOAD_ARCHIVE="backups/uploads-${STAMP}.tar.gz"

echo "==> Backing up database ${DB_NAME}@${DB_HOST}:${DB_PORT}"
if [[ "${DB_HOST}" == "db" ]]; then
  docker compose exec -T db pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc > "${DB_DUMP}"
else
  TARGET_HOST="${DB_HOST}"
  [[ "${TARGET_HOST}" == "host.docker.internal" ]] && TARGET_HOST="127.0.0.1"
  docker run --rm --network host \
    -e PGPASSWORD="${DB_PASS}" \
    -v "${ROOT}/backups:/backup" \
    postgres:16-alpine \
    pg_dump -h "${TARGET_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "/backup/$(basename "${DB_DUMP}")"
fi

echo "==> Backing up uploaded files"
docker run --rm \
  -v "${UPLOAD_VOLUME}:/data:ro" \
  -v "${ROOT}/backups:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$(basename "${UPLOAD_ARCHIVE}")" -C /data .

echo "==> Pruning backups older than 14 days"
find backups -type f \( -name '*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +14 -delete

echo "Database: ${DB_DUMP} ($(du -h "${DB_DUMP}" | cut -f1))"
echo "Uploads:  ${UPLOAD_ARCHIVE} ($(du -h "${UPLOAD_ARCHIVE}" | cut -f1))"
