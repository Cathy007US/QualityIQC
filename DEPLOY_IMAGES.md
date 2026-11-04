# quality-Iqc 镜像构建与服务器部署流程

本项目采用**本地构建 x86_64 镜像 → `docker save` 压缩 → 上传服务器 → `docker load` → Compose 运行**的方式。

适用场景：

- 本地开发机是 Apple Silicon（ARM64）
- 服务器是腾讯云 x86_64（amd64）
- 服务器只有 2GB 内存，避免在服务器上执行 `docker build`
- 服务器已有 PostgreSQL，不把数据库打进镜像

> 关键点：**必须在本地用 `--platform linux/amd64` 构建，不要直接在 ARM Mac 上保存默认镜像。**  
> 否则服务器执行时会遇到 `exec format error`。

---

## 1. 本地准备

```bash
cd quality-Iqc
docker buildx version
docker compose version
```

确认 Docker Desktop 正在运行。

本项目包含两个镜像：

| 镜像 | 作用 | Dockerfile |
| --- | --- | --- |
| `quality-iqc-api:1.1.0` | FastAPI 后端 | `backend/Dockerfile` |
| `quality-iqc-web:1.1.0` | Nginx + React 前端 | `frontend/Dockerfile` |

端口约定：

- Web 容器：80，映射到宿主机 `8088`
- API 容器：8000，仅容器内网
- PostgreSQL：现有实例 `5432`

---

## 2. 本地构建 linux/amd64 镜像

### 推荐：一键构建

```bash
cd quality-Iqc
chmod +x scripts/build-images.sh
./scripts/build-images.sh 1.1.0
```

脚本会：

1. 构建 `quality-iqc-api:1.1.0`
2. 构建 `quality-iqc-web:1.1.0`
3. 校验两个镜像都是 `linux/amd64`
4. 使用 `docker save` 生成合并镜像包
5. 生成服务器配置包

输出：

```text
dist-packages/
├── quality-iqc-images-1.1.0.tar.gz
├── quality-iqc-images-1.1.0.tar.gz.sha256
├── quality-iqc-server-1.1.0.tar.gz
└── quality-iqc-server-1.1.0.tar.gz.sha256
```

### 手动构建（等价命令）

如果不想用脚本，可以逐条执行：

```bash
# 后端
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t quality-iqc-api:1.1.0 \
  -f backend/Dockerfile \
  backend \
  --load

# 前端
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t quality-iqc-web:1.1.0 \
  -f frontend/Dockerfile \
  frontend \
  --load

# 必须确认是 amd64
docker image inspect quality-iqc-api:1.1.0 --format '{{.Os}}/{{.Architecture}}'
docker image inspect quality-iqc-web:1.1.0 --format '{{.Os}}/{{.Architecture}}'

# 两个镜像合并保存
docker save quality-iqc-api:1.1.0 quality-iqc-web:1.1.0 \
  | gzip > dist-packages/quality-iqc-images-1.1.0.tar.gz

shasum -a 256 dist-packages/quality-iqc-images-1.1.0.tar.gz
```

`--provenance=false` 用于避免 BuildKit 附带 attestation manifest，部分 Docker 版本在 `docker save`/`docker load` 时会因此出现额外平台或镜像找不到的问题。

---

## 3. 上传到服务器

先在本地确认文件：

```bash
ls -lh dist-packages/quality-iqc-images-1.1.0.tar.gz
ls -lh dist-packages/quality-iqc-server-1.1.0.tar.gz
cat dist-packages/quality-iqc-images-1.1.0.tar.gz.sha256
```

上传（镜像较大，建议 `rsync` 支持断点续传）：

```bash
rsync -avP dist-packages/quality-iqc-images-1.1.0.tar.gz root@SERVER_IP:/tmp/
rsync -avP dist-packages/quality-iqc-server-1.1.0.tar.gz root@SERVER_IP:/tmp/
```

或者：

```bash
scp dist-packages/quality-iqc-images-1.1.0.tar.gz root@SERVER_IP:/tmp/
scp dist-packages/quality-iqc-server-1.1.0.tar.gz root@SERVER_IP:/tmp/
```

---

## 4. 服务器准备

SSH 登录：

```bash
ssh root@SERVER_IP
```

确认架构和 Docker：

```bash
uname -m
# 期望 x86_64

docker version
docker compose version
```

如果服务器是 2GB 内存，建议加 swap：

```bash
free -h
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

校验上传文件：

```bash
cd /tmp
sha256sum quality-iqc-images-1.1.0.tar.gz
# 与本地 quality-iqc-images-1.1.0.tar.gz.sha256 对比
```

---

## 5. 服务器加载镜像

```bash
gunzip -c /tmp/quality-iqc-images-1.1.0.tar.gz | docker load
```

检查：

```bash
docker image ls | grep quality-iqc

docker image inspect quality-iqc-api:1.1.0 --format '{{.Os}}/{{.Architecture}}'
docker image inspect quality-iqc-web:1.1.0 --format '{{.Os}}/{{.Architecture}}'
```

必须看到：

```text
linux/amd64
linux/amd64
```

如果看到 `linux/arm64`，说明本地构建时没有加 `--platform linux/amd64`，服务器运行会报 `exec format error`。

---

## 6. 服务器目录与配置

解压 server 配置包：

```bash
sudo mkdir -p /opt/quality-iqc
sudo tar -xzf /tmp/quality-iqc-server-1.1.0.tar.gz -C /opt/quality-iqc
cd /opt/quality-iqc
cp .env.production.example .env
chmod 600 .env
vi .env
```

需要填写/确认：

```dotenv
ENVIRONMENT=production

# 现有 PostgreSQL；独立库 iqc_insp
DATABASE_URL=postgresql+psycopg://iqc_user:替换密码@host.docker.internal:5432/iqc_insp

# openssl rand -hex 32
SECRET_KEY=替换为随机密钥

ADMIN_USERNAME=admin
ADMIN_PASSWORD=替换为强密码
ADMIN_DISPLAY_NAME=光伏质量部管理员

MAX_UPLOAD_MB=25
CORS_ORIGINS=https://你的域名

WEB_PORT=8088

# 与 docker load 的镜像标签完全一致
API_IMAGE=quality-iqc-api:1.1.0
WEB_IMAGE=quality-iqc-web:1.1.0

# 全新服务器使用这个卷；从旧项目升级时改成旧上传卷名
UPLOAD_VOLUME=quality-iqc_iqc_uploads
```

生成密钥：

```bash
openssl rand -hex 32
```

### 如果 PostgreSQL 的 5432 没有发布到宿主机

先查现有 PostgreSQL 容器所在网络：

```bash
docker inspect pg16 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# 假设输出 pg_default
```

把 `.env` 中 `DATABASE_URL` 的主机改成 **pg 容器名**：

```dotenv
DATABASE_URL=postgresql+psycopg://iqc_user:替换密码@pg16:5432/iqc_insp
```

启动时使用附加网络配置：

```bash
PG_NETWORK=pg_default \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml up -d
```

之后可以用同样两个 `-f` 参数查看状态和日志。

---

## 7. 启动

```bash
cd /opt/quality-iqc
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

注意：**不要加 `--build`**。生产 Compose 使用预构建的 `image:`，并设置了 `pull_policy: never`，不会去 Docker Hub 拉取。

首次启动 API 会自动：

- 创建/升级表结构
- 回填 `documents.locale`
- 创建分类、英文翻译和管理员
- 启动 Uvicorn

检查：

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl -fsS http://127.0.0.1:8088/api/health
```

期望：

```json
{"status":"ok","database":"ok","version":"1.1.0"}
```

---

## 8. 宿主机 Nginx 与 HTTPS

server 配置包中已包含 `deploy/nginx-host.conf`：

```bash
sudo cp /opt/quality-iqc/deploy/nginx-host.conf /etc/nginx/sites-available/quality-iqc.conf
sudo sed -i 's/iqc.xx.com/你的真实域名/g' /etc/nginx/sites-available/quality-iqc.conf
sudo ln -sf /etc/nginx/sites-available/quality-iqc.conf /etc/nginx/sites-enabled/quality-iqc.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

安装 Certbot 并签发证书：

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名 --redirect
sudo certbot renew --dry-run
```

腾讯云安全组放行 `80`、`443`，不要对公网开放 `5432`、`8000`、`8088`。

---

## 9. 上线验收

```bash
curl -fsS https://你的域名/api/health
curl -I https://你的域名/zh
curl -I https://你的域名/en
```

浏览器检查：

- `/zh` 中文首页
- `/en` 英文首页
- 顶部语言切换
- 同一标准中英文详情互跳
- 搜索、分类筛选、详情图片
- 原文件下载
- 后台上传中文/英文文档
- Word / Excel 图片预览
- 手机端页面

---

## 10. 版本升级流程

假设从 `1.1.0` 升到 `1.1.1`：

本地：

```bash
cd quality-Iqc
./scripts/build-images.sh 1.1.1
```

上传两个文件：

```bash
rsync -avP dist-packages/quality-iqc-images-1.1.1.tar.gz root@SERVER_IP:/tmp/
rsync -avP dist-packages/quality-iqc-server-1.1.1.tar.gz root@SERVER_IP:/tmp/
```

服务器：

```bash
# 先备份
cd /opt/quality-iqc
./scripts/backup.sh

# 加载新镜像
gunzip -c /tmp/quality-iqc-images-1.1.1.tar.gz | docker load
docker image ls | grep quality-iqc

# 更新 .env 中两个镜像标签
vi .env
# API_IMAGE=quality-iqc-api:1.1.1
# WEB_IMAGE=quality-iqc-web:1.1.1

# 用新镜像重建容器，不 build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:8088/api/health

# 清理旧镜像（确认新版本没问题后再执行）
docker image rm quality-iqc-api:1.1.0 quality-iqc-web:1.1.0
```

---

## 11. 回滚

镜像回滚：

```bash
cd /opt/quality-iqc
vi .env
# 把 API_IMAGE / WEB_IMAGE 改回旧版本，例如 1.1.0
docker compose -f docker-compose.prod.yml up -d
```

数据库回滚：

```bash
docker run --rm \
  -e PGPASSWORD='数据库密码' \
  -v /opt/quality-iqc/backups:/backup \
  postgres:16-alpine \
  pg_restore -h host.docker.internal -p 5432 \
    -U iqc_user -d iqc_insp \
    -c /backup/iqc_insp-YYYYmmdd-HHMMSS.dump
```

> 恢复数据库会覆盖当前数据，执行前先确认备份文件和目标库。

---

## 12. 备份

服务器配置包包含 `scripts/backup.sh`：

```bash
cd /opt/quality-iqc
./scripts/backup.sh
```

脚本会读取 `.env` 中的：

- `DATABASE_URL`
- `UPLOAD_VOLUME`

备份数据库和上传卷到 `backups/`。

定时任务示例：

```bash
sudo crontab -e
30 2 * * * cd /opt/quality-iqc && ./scripts/backup.sh >> /var/log/quality-iqc-backup.log 2>&1
```

---

## 13. 常见问题

### `exec format error`

镜像架构错误，通常是本地构建时没加 `--platform linux/amd64`。

```bash
docker image inspect quality-iqc-api:1.1.0 --format '{{.Os}}/{{.Architecture}}'
```

必须是 `linux/amd64`，否则重新构建。

### `docker load` 后 `image not found`

检查：

```bash
docker image ls | grep quality-iqc
```

确认 `.env` 中：

```dotenv
API_IMAGE=quality-iqc-api:1.1.0
WEB_IMAGE=quality-iqc-web:1.1.0
```

标签必须和 `docker save` 时完全一致。

### API 日志：`failed to resolve host 'db'`

`.env` 还是本地 Compose 的地址。改成生产 DB 地址：

```dotenv
DATABASE_URL=postgresql+psycopg://iqc_user:密码@host.docker.internal:5432/iqc_insp
```

或使用 `docker-compose.prod-pg-network.yml`。

### 上传返回 413

检查三处：

- `.env` 的 `MAX_UPLOAD_MB`
- 前端容器 Nginx 的 `client_max_body_size`（已在镜像内配置 30m）
- 宿主机 Nginx 的 `client_max_body_size`（`deploy/nginx-host.conf` 已配置 30m）

### 服务器报 `no space left on device`

镜像包本身较大，上传前确认磁盘：

```bash
df -h
docker system df
```

删除旧镜像前先确认当前版本可回滚。
