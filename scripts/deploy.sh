#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh <ssh-host> [remote-dir]
# Example: ./scripts/deploy.sh root@1.2.3.4 /opt/quality-iqc
HOST="${1:-${DEPLOY_HOST:-}}"
REMOTE_DIR="${2:-/opt/quality-iqc}"

if [[ -z "${HOST}" ]]; then
  echo "Usage: $0 <user@server> [remote-dir]" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="/tmp/quality-iqc-${STAMP}.tar.gz"

echo "==> Packaging ${ARCHIVE}"
tar -C "${ROOT}" \
  --exclude='./.git' \
  --exclude='./.env' \
  --exclude='./.env.local' \
  --exclude='./.env.production' \
  --exclude='./node_modules' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/dist' \
  --exclude='./frontend/.npm-cache' \
  --exclude='./.venv' \
  --exclude='./.pip-cache' \
  --exclude='./.tools' \
  --exclude='./qa' \
  --exclude='./dist-packages' \
  --exclude='./backups' \
  --exclude='./backend/uploads/*' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  -czf "${ARCHIVE}" .

echo "==> Uploading to ${HOST}"
scp "${ARCHIVE}" "${HOST}:/tmp/"

echo "==> Deploying to ${REMOTE_DIR}"
ssh "${HOST}" "set -euo pipefail
  sudo mkdir -p '${REMOTE_DIR}'
  sudo tar -xzf '/tmp/$(basename "${ARCHIVE}")' -C '${REMOTE_DIR}'
  cd '${REMOTE_DIR}'
  if [ ! -f .env ]; then
    echo 'ERROR: ${REMOTE_DIR}/.env 不存在。请先根据 .env.production.example 创建生产配置。' >&2
    exit 1
  fi
  docker compose up -d --build
  docker compose ps
  curl -fsS http://127.0.0.1:\$(grep -E '^WEB_PORT=' .env | cut -d= -f2 || echo 8088)/api/health
  echo
  echo '部署完成。请确认宿主机 Nginx 已反向代理到 127.0.0.1:'\$(grep -E '^WEB_PORT=' .env | cut -d= -f2 || echo 8088)
"

echo "==> Done"
