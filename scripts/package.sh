#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${ROOT}/dist-packages"
ARCHIVE="${OUT_DIR}/quality-iqc-source-${STAMP}.tar.gz"

mkdir -p "${OUT_DIR}"

# Intentionally excludes .env, uploads, local database data, node_modules and QA artifacts.
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

echo "源码部署包已生成: ${ARCHIVE}"
echo "大小: $(du -h "${ARCHIVE}" | cut -f1)"
echo
echo "上传后在服务器执行:"
echo "  tar -xzf $(basename "${ARCHIVE}") -C /opt/quality-iqc"
echo "  cd /opt/quality-iqc && cp .env.production.example .env && vi .env"
echo "  # 或使用 DEPLOY_IMAGES.md 的预构建镜像流程（推荐）"
