# quality-Iqc 生产环境运维手册

本文用于 **quality-Iqc 已上线后的日常更新与运维**，不是首次开发环境搭建文档。

> 本文中的 `aa.xxx.com` 是示例域名，`服务器ip` 是示例服务器 IP。  
> 实际执行时替换成真实域名和 IP；不要把真实敏感信息提交到公开仓库。

生产环境信息：

```text
项目：quality-Iqc
生产目录：/home/ubuntu/quality-iqc
访问地址：https://aa.xxx.com
后台地址：https://aa.xxx.com/login
Web 容器端口：80
宿主机回环端口：127.0.0.1:8088
PostgreSQL 容器：pg
PostgreSQL 网络：reading-net
PostgreSQL 库：iqc_insp
镜像：quality-iqc-api / quality-iqc-web
```

端口和现有服务：

```text
80   现有宿主机 Nginx
8088 quality-Iqc Web 容器（仅回环）
5432 PostgreSQL pg 容器（仅回环）
3001 reading-api（其他项目）
3002 bookhealth 后端（其他项目）
8090 bookhealth 前端（其他项目）
```

生产原则：

1. 不在服务器上执行 `docker build`。
2. 本地构建 `linux/amd64` 镜像。
3. `docker save` 后在服务器 `docker load`。
4. 更新时只替换变化的组件。
5. 后端更新前先备份数据库。
6. 不执行 `docker compose down -v`。
7. 不改动其他项目的端口和容器。
8. 生产 Compose 必须带 `reading-net` 覆盖文件。

---

## 1. 当前生产状态检查

每次操作前先确认：

```bash
cd /home/ubuntu/quality-iqc

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl -fsS http://127.0.0.1:8088/api/health
```

期望：

```json
{"status":"ok","database":"ok","version":"1.1.0"}
```

公网检查：

```bash
curl -I https://aa.xxx.com/zh
curl -I https://aa.xxx.com/en
curl -fsS https://aa.xxx.com/api/health
```

---

## 2. 更新决策表

| 改动内容 | 需要构建 | 需要更新 `.env` | 需要重启 |
| --- | --- | --- | --- |
| 前端 React / CSS / 文案 | `quality-iqc-web` | `WEB_IMAGE` | web |
| 后端 Python / 接口 / 解析逻辑 | `quality-iqc-api` | `API_IMAGE` | api |
| 前后端都改 | 两个镜像 | 两个标签 | api + web |
| 只改 `.env` | 不构建 | 对应变量 | 对应容器 |
| 只改 Nginx 配置 | 不构建 | 不改 | reload Nginx |
| 只改 `docker-compose.prod.yml` | 不构建 | 可能不改 | 重新 up |
| 只改文档 | 不构建 | 不改 | 不需要 |

---

## 3. 版本号约定

不要长期复用同一个镜像标签，否则容器可能不会自动重建。

建议：

```text
只改前端：  web 1.1.1，api 保持 1.1.0
只改后端：  api 1.1.2，web 保持 1.1.1
前后端都改：api 1.1.3，web 1.1.3
```

`.env` 中两个标签可以不同：

```dotenv
API_IMAGE=quality-iqc-api:1.1.2
WEB_IMAGE=quality-iqc-web:1.1.1
```

每次发布保留旧镜像，便于回滚。

---

## 4. 只更新前端

适用：

- React 页面
- CSS / Tailwind
- 中英文文案
- 前端路由、组件
- `frontend/package.json` 依赖
- `frontend/Dockerfile`

### 4.1 本地构建 web

```bash
cd quality-Iqc

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t quality-iqc-web:1.1.1 \
  -f frontend/Dockerfile \
  frontend \
  --load

docker image inspect quality-iqc-web:1.1.1 \
  --format '{{.Os}}/{{.Architecture}}'
```

必须是：

```text
linux/amd64
```

### 4.2 保存并上传

```bash
docker save quality-iqc-web:1.1.1 \
  | gzip > dist-packages/quality-iqc-web-1.1.1.tar.gz

scp dist-packages/quality-iqc-web-1.1.1.tar.gz \
  ubuntu@服务器ip:/tmp/
```

### 4.3 服务器加载

```bash
gunzip -c /tmp/quality-iqc-web-1.1.1.tar.gz | docker load
docker image ls | grep quality-iqc-web
```

### 4.4 修改 `.env`

```bash
cd /home/ubuntu/quality-iqc
nano .env
```

只改 web：

```dotenv
WEB_IMAGE=quality-iqc-web:1.1.1
API_IMAGE=quality-iqc-api:1.1.0
```

### 4.5 只重建 web

```bash
cd /home/ubuntu/quality-iqc

PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate web
```

### 4.6 检查

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:8088/api/health
curl -I https://aa.xxx.com/zh
```

前端更新不需要动数据库、API 和 Nginx。浏览器强制刷新一次。

---

## 5. 只更新后端

适用：

- FastAPI 接口
- 解析逻辑
- 权限、鉴权
- 数据模型
- `backend/requirements.txt`
- `backend/Dockerfile`

### 5.1 先备份

```bash
cd /home/ubuntu/quality-iqc
./scripts/backup.sh
```

确认 `backups/` 下有新的 `.dump` 和 `uploads-*.tar.gz`。

### 5.2 本地构建 API

```bash
cd quality-Iqc

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t quality-iqc-api:1.1.2 \
  -f backend/Dockerfile \
  backend \
  --load

docker image inspect quality-iqc-api:1.1.2 \
  --format '{{.Os}}/{{.Architecture}}'
```

### 5.3 保存并上传

```bash
docker save quality-iqc-api:1.1.2 \
  | gzip > dist-packages/quality-iqc-api-1.1.2.tar.gz

scp dist-packages/quality-iqc-api-1.1.2.tar.gz \
  ubuntu@服务器ip:/tmp/
```

### 5.4 服务器加载

```bash
gunzip -c /tmp/quality-iqc-api-1.1.2.tar.gz | docker load
docker image ls | grep quality-iqc-api
```

### 5.5 修改 `.env`

```bash
cd /home/ubuntu/quality-iqc
nano .env
```

```dotenv
API_IMAGE=quality-iqc-api:1.1.2
WEB_IMAGE=quality-iqc-web:1.1.1
```

### 5.6 只重建 API

```bash
cd /home/ubuntu/quality-iqc

PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate api
```

### 5.7 检查

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 api
curl -fsS http://127.0.0.1:8088/api/health
```

API 启动时会自动执行现有轻量数据库迁移。更新期间 web 可能短暂返回 502，API 健康后恢复。

---

## 6. 前后端都更新

### 6.1 备份

```bash
cd /home/ubuntu/quality-iqc
./scripts/backup.sh
```

### 6.2 本地构建两个镜像

```bash
cd quality-Iqc

./scripts/build-images.sh 1.1.3
```

或手动：

```bash
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t quality-iqc-api:1.1.3 \
  -f backend/Dockerfile backend --load

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t quality-iqc-web:1.1.3 \
  -f frontend/Dockerfile frontend --load
```

检查：

```bash
docker image inspect quality-iqc-api:1.1.3 \
  --format '{{.Os}}/{{.Architecture}}'

docker image inspect quality-iqc-web:1.1.3 \
  --format '{{.Os}}/{{.Architecture}}'
```

### 6.3 合并保存

```bash
docker save \
  quality-iqc-api:1.1.3 \
  quality-iqc-web:1.1.3 \
  | gzip > dist-packages/quality-iqc-images-1.1.3.tar.gz
```

### 6.4 上传和加载

```bash
scp dist-packages/quality-iqc-images-1.1.3.tar.gz \
  ubuntu@服务器ip:/tmp/
```

服务器：

```bash
gunzip -c /tmp/quality-iqc-images-1.1.3.tar.gz | docker load
docker image ls | grep quality-iqc
```

### 6.5 修改 `.env`

```dotenv
API_IMAGE=quality-iqc-api:1.1.3
WEB_IMAGE=quality-iqc-web:1.1.3
```

### 6.6 重建两个容器

```bash
cd /home/ubuntu/quality-iqc

PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --force-recreate

docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:8088/api/health
```

---

## 7. 只修改 `.env`

不需要构建镜像。

```bash
cd /home/ubuntu/quality-iqc
nano .env

PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --force-recreate
```

只改 API 配置时：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate api
```

注意：

- 修改 `ADMIN_PASSWORD` 不会更新已存在的 admin 用户。
- 修改 `DATABASE_URL` 后必须重建 API。
- 修改 `WEB_PORT` 后还要同步修改 Nginx 的 `proxy_pass`。
- 修改 `CORS_ORIGINS` 后重建 API。

---

## 8. 只修改 Nginx

不需要动 Docker 容器。

```bash
DOMAIN=你的真实域名

sudo cp /home/ubuntu/quality-iqc/deploy/nginx-host.conf \
  /tmp/qualityiqc.conf

sudo sed -i "s/aa.xxx.com/${DOMAIN}/g" /tmp/qualityiqc.conf

sudo cp /tmp/qualityiqc.conf \
  /etc/nginx/sites-available/qualityiqc.conf

sudo ln -sf /etc/nginx/sites-available/qualityiqc.conf \
  /etc/nginx/sites-enabled/qualityiqc.conf

sudo nginx -t
sudo systemctl reload nginx
```

如果 `nginx -t` 失败，不要 reload。

检查：

```bash
sudo readlink -f /etc/nginx/sites-enabled/qualityiqc.conf
sudo nginx -T | grep -nE 'server_name|proxy_pass'
```

---

## 9. 生产 Compose 固定命令

启动全部：

```bash
cd /home/ubuntu/quality-iqc

PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d
```

只重建前端：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate web
```

只重建后端：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate api
```

查看日志：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 logs --tail=100 api
```

---

## 10. 回滚

回滚前先确认旧镜像还在：

```bash
docker image ls | grep quality-iqc
```

修改 `.env`：

```dotenv
API_IMAGE=quality-iqc-api:1.1.0
WEB_IMAGE=quality-iqc-web:1.1.0
```

只回滚前端：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate web
```

只回滚后端：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate api
```

数据库回滚：

```bash
ls -lh backups/
```

恢复数据库会覆盖现有数据，必须先确认备份文件和时间。

---

## 11. 备份

```bash
cd /home/ubuntu/quality-iqc
./scripts/backup.sh
```

备份内容：

- PostgreSQL `iqc_insp`
- 上传文件卷 `quality-iqc_iqc_uploads`

定时任务：

```cron
30 2 * * * cd /home/ubuntu/quality-iqc && ./scripts/backup.sh >> /var/log/quality-iqc-backup.log 2>&1
```

检查：

```bash
ls -lh backups/ | tail
```

---

## 12. 上线验收

```bash
curl -fsS https://aa.xxx.com/api/health
curl -I https://aa.xxx.com/zh
curl -I https://aa.xxx.com/en
```

浏览器检查：

- 中文首页
- 英文首页
- 语言切换
- 中英文详情互跳
- 搜索和分类筛选
- Word / Excel 图片预览
- 原文件下载
- 后台上传
- 手机端页面

前端更新后如果页面没变化，强制刷新：

```text
Ctrl + Shift + R
```

---

## 13. 常见生产问题

### 13.1 `exec format error`

```bash
docker image inspect quality-iqc-api:1.1.2 \
  --format '{{.Os}}/{{.Architecture}}'
```

必须是 `linux/amd64`。否则本地重新构建。

### 13.2 `docker load` 找不到文件

```bash
find /tmp /home/ubuntu -maxdepth 5 \
  -name 'quality-iqc-*.tar.gz' -ls
```

注意是 `quality-iqc`，不是 `quality-qic`。

### 13.3 `.env` 解析失败

```text
unexpected character "#" in variable name
```

说明 `.env` 有 `qq#`、`cd`、`cat` 等内容：

```bash
cd /home/ubuntu/quality-iqc
truncate -s 0 .env
nano .env
```

### 13.4 `password authentication failed`

```bash
docker exec -it pg psql -U postgres -c \
  "ALTER ROLE iqc_user WITH LOGIN PASSWORD '数据库实际密码';"
```

然后：

```bash
PG_NETWORK=reading-net \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml \
                 up -d --no-deps --force-recreate api
```

### 13.5 `connection refused 172.17.0.1:5432`

检查 `.env`：

```dotenv
DATABASE_URL=postgresql+psycopg://iqc_user:数据库实际密码@pg:5432/iqc_insp
```

必须是 `@pg`，不是 `host.docker.internal`。

### 13.6 Nginx 502

```bash
curl -v http://127.0.0.1:8088/api/health
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### 13.7 Nginx 悬空软链接

```text
open() "/etc/nginx/sites-enabled/qualityiqc.conf" failed
```

处理：

```bash
sudo rm -f /etc/nginx/sites-enabled/qualityiqc.conf
sudo ls -l /etc/nginx/sites-available/qualityiqc.conf
sudo ln -s /etc/nginx/sites-available/qualityiqc.conf \
  /etc/nginx/sites-enabled/qualityiqc.conf
sudo nginx -t
```

### 13.8 Certbot 要求邮箱

不要输入 `c`：

```bash
sudo certbot --nginx -d aa.xxx.com --redirect \
  -m your-email@example.com --agree-tos --no-eff-email
```

---

## 14. 禁止操作

```text
不要在服务器执行 docker build
不要在服务器执行 docker compose up --build
不要执行 docker compose down -v
不要删除 PostgreSQL pg 容器
不要修改 3001 / 3002 / 8090
不要停止现有宿主机 Nginx
不要把 .env 提交到 Git
不要把真实密码写入文档
```

---

## 15. 发布检查清单

```text
[ ] 已确认改动范围：前端 / 后端 / 两者
[ ] 本地镜像使用 linux/amd64
[ ] 后端更新前已执行 backup.sh
[ ] 镜像已 docker save
[ ] 镜像已上传并 docker load
[ ] .env 中镜像标签已更新
[ ] 启动时使用 docker-compose.prod.yml + pg 网络覆盖文件
[ ] API health 返回 status=ok
[ ] /zh、/en 页面正常
[ ] 上传和图片预览正常
[ ] 旧镜像保留，可回滚
[ ] 没有影响其他项目端口
```
