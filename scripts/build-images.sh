#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

VERSION="${1:-1.1.0}"
PLATFORM="${PLATFORM:-linux/amd64}"
API_IMAGE="quality-iqc-api:${VERSION}"
WEB_IMAGE="quality-iqc-web:${VERSION}"
OUT_DIR="${ROOT}/dist-packages"
IMAGE_ARCHIVE="${OUT_DIR}/quality-iqc-images-${VERSION}.tar.gz"
SERVER_BUNDLE_DIR="${OUT_DIR}/quality-iqc-server-${VERSION}"
SERVER_BUNDLE="${OUT_DIR}/quality-iqc-server-${VERSION}.tar.gz"

mkdir -p "${OUT_DIR}"

if ! docker buildx version >/dev/null 2>&1; then
  echo "ERROR: docker buildx 不可用，请先安装/启用 Buildx" >&2
  exit 1
fi

if [[ "${SKIP_IMAGES:-0}" == "1" ]]; then
  echo "==> SKIP_IMAGES=1, using existing local images and rebuilding server bundle only"
else
  echo "==> Building API image ${API_IMAGE} (${PLATFORM})"
docker buildx build \
  --platform "${PLATFORM}" \
  --provenance=false \
  -t "${API_IMAGE}" \
  -f backend/Dockerfile \
  backend \
  --load

echo "==> Building Web image ${WEB_IMAGE} (${PLATFORM})"
docker buildx build \
  --platform "${PLATFORM}" \
  --provenance=false \
  -t "${WEB_IMAGE}" \
  -f frontend/Dockerfile \
  frontend \
  --load

for image in "${API_IMAGE}" "${WEB_IMAGE}"; do
  ARCH="$(docker image inspect "${image}" --format '{{.Architecture}}')"
  OS="$(docker image inspect "${image}" --format '{{.Os}}')"
  echo "    ${image}: ${OS}/${ARCH}"
  if [[ "${ARCH}" != "amd64" ]]; then
    echo "ERROR: ${image} 不是 amd64 镜像，不能上传到 x86 服务器" >&2
    exit 1
  fi
done

echo "==> Saving images to ${IMAGE_ARCHIVE}"
docker save "${API_IMAGE}" "${WEB_IMAGE}" | gzip > "${IMAGE_ARCHIVE}"
(cd "${OUT_DIR}" && shasum -a 256 "$(basename "${IMAGE_ARCHIVE}")" > "$(basename "${IMAGE_ARCHIVE}").sha256")
cat "${IMAGE_ARCHIVE}.sha256"

fi

echo "==> Building server files bundle"
rm -rf "${SERVER_BUNDLE_DIR}"
mkdir -p "${SERVER_BUNDLE_DIR}/deploy" "${SERVER_BUNDLE_DIR}/scripts"
cp docker-compose.prod.yml "${SERVER_BUNDLE_DIR}/"
cp docker-compose.prod-pg-network.yml "${SERVER_BUNDLE_DIR}/"
cp .env.production.example "${SERVER_BUNDLE_DIR}/"
cp DEPLOY_IMAGES.md "${SERVER_BUNDLE_DIR}/"
cp DEPLOY_THIS_SERVER.md "${SERVER_BUNDLE_DIR}/"
cp deploy/nginx-host.conf "${SERVER_BUNDLE_DIR}/deploy/"
cp scripts/backup.sh "${SERVER_BUNDLE_DIR}/scripts/"
tar -czf "${SERVER_BUNDLE}" -C "${SERVER_BUNDLE_DIR}" .
(cd "${OUT_DIR}" && shasum -a 256 "$(basename "${SERVER_BUNDLE}")" > "$(basename "${SERVER_BUNDLE}").sha256")
cat "${SERVER_BUNDLE}.sha256"

echo
echo "构建完成："
echo "  镜像包：${IMAGE_ARCHIVE}"
echo "  服务端配置包：${SERVER_BUNDLE}"
echo
echo "下一步："
echo "  scp '${IMAGE_ARCHIVE}' '${SERVER_BUNDLE}' ubuntu@SERVER_IP:/tmp/"
echo "  # 服务器执行："
echo "  gunzip -c /tmp/$(basename "${IMAGE_ARCHIVE}") | docker load"
echo "  mkdir -p /home/ubuntu/quality-iqc"
echo "  tar -xzf /tmp/$(basename "${SERVER_BUNDLE}") -C /home/ubuntu/quality-iqc"
echo "  cd /home/ubuntu/quality-iqc && cp .env.production.example .env && vi .env"
echo "  docker compose -f docker-compose.prod.yml up -d"
