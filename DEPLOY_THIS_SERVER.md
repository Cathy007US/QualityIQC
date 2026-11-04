# quality-Iqc 当前服务器配置

本文件使用脱敏占位符；执行时替换为真实值：

```text
服务器公网 IP：服务器ip
域名：aa.xxx.com
服务器目录：/home/ubuntu/quality-iqc
宿主机 80：已有 Nginx，被其他项目使用，不新建 80 监听
Web 容器映射：127.0.0.1:8088（仅回环，由现有 Nginx 反代）
其他项目端口：3001 / 3002 / 8090，均不改动
```

> 部署前先确认 `aa.xxx.com` 已解析到 `服务器ip`。如果浏览器访问仍是其他项目页面，说明 Nginx 站点还未启用；按第 6 节配置即可。

---

## 0. 先添加 DNS A 记录

在 xxx.com 的 DNS 控制台添加：

```text
类型：A
主机记录：qualityiqc
记录值：服务器ip
TTL：600
```

验证：

```bash
dig +short aa.xxx.com
```

期望：

```text
服务器ip
```

DNS 未生效前，可以先用 Host 头验证 Nginx：

```bash
curl -I -H 'Host: aa.xxx.com' http://127.0.0.1/
```

---

## 1. 确认镜像和配置包

本地 Mac：

```bash
cd /Users/Desktop/2026items/Checking/quality-Iqc
ls -lh dist-packages/quality-iqc-images-1.1.0.tar.gz
ls -lh dist-packages/quality-iqc-server-1.1.0.tar.gz
```

上传：

```bash
scp dist-packages/quality-iqc-images-1.1.0.tar.gz \
    dist-packages/quality-iqc-server-1.1.0.tar.gz \
    ubuntu@服务器ip:/tmp/
```

服务器：

```bash
gunzip -c /tmp/quality-iqc-images-1.1.0.tar.gz | docker load

docker image ls | grep quality-iqc
```

---

## 2. 解压服务器配置

```bash
mkdir -p /home/ubuntu/quality-iqc
tar -xzf /tmp/quality-iqc-server-1.1.0.tar.gz \
  -C /home/ubuntu/quality-iqc

cd /home/ubuntu/quality-iqc
ls -la
```

应看到：

```text
docker-compose.prod.yml
docker-compose.prod-pg-network.yml
.env.production.example
deploy/nginx-host.conf
scripts/backup.sh
```

---

## 3. 检查 8088 是否空闲

```bash
sudo ss -lntp | grep -E ':(80|8088)\s' || true
```

如果 `8088` 已被占用，请把下面两处统一换成其他端口（例如 `8091`）：

- `.env` 中 `WEB_PORT`
- `deploy/nginx-host.conf` 中 `proxy_pass http://127.0.0.1:8088`

当前配置默认使用 `8088`。

---

## 4. 创建生产 `.env`

```bash
cd /home/ubuntu/quality-iqc
cp .env.production.example .env
chmod 600 .env
nano .env
```

必须填写：

```dotenv
ENVIRONMENT=production

# 现有 PostgreSQL，独立库 iqc_insp
DATABASE_URL=postgresql+psycopg://iqc_user:实际密码@host.docker.internal:5432/iqc_insp

# openssl rand -hex 32
SECRET_KEY=替换为随机值

ADMIN_USERNAME=admin
ADMIN_PASSWORD=替换为强密码
ADMIN_DISPLAY_NAME=光伏质量部管理员

MAX_UPLOAD_MB=25
CORS_ORIGINS=https://aa.xxx.com

WEB_PORT=8088

API_IMAGE=quality-iqc-api:1.1.0
WEB_IMAGE=quality-iqc-web:1.1.0
UPLOAD_VOLUME=quality-iqc_iqc_uploads
```

### PostgreSQL 不在宿主机 5432

如果 `5432` 没有发布到宿主机：

```bash
docker inspect <pg容器名> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

把 `DATABASE_URL` 的主机改成 pg 容器名，例如：

```dotenv
DATABASE_URL=postgresql+psycopg://iqc_user:实际密码@pg16:5432/iqc_insp
```

启动时使用：

```bash
PG_NETWORK=pg_default \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml up -d
```

---

## 5. 启动容器

这里是**预构建镜像**流程，不要加 `--build`：

```bash
cd /home/ubuntu/quality-iqc
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 api
curl -fsS http://127.0.0.1:8088/api/health
```

期望：

```json
{"status":"ok","database":"ok","version":"1.1.0"}
```

如果使用 pg 网络覆盖：

```bash
PG_NETWORK=pg_default \
  docker compose -f docker-compose.prod.yml \
                 -f docker-compose.prod-pg-network.yml up -d
```

---

## 6. 配置宿主机 Nginx

服务器 80 已被现有 Nginx 使用，本配置**不新建 80 监听**，只新增一个 `server_name` 虚拟主机：

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

验证 HTTP（DNS 生效后）：

```bash
curl -I http://aa.xxx.com/
```

DNS 未生效时用 Host 头：

```bash
curl -I -H 'Host: aa.xxx.com' http://127.0.0.1/
```

应返回 `200` 或跳转，不再是其他项目的默认页面。

---

## 7. 签发 HTTPS

DNS A 记录生效后再执行：

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aa.xxx.com --redirect
sudo certbot renew --dry-run
```

完成后：

```bash
curl -I https://aa.xxx.com/
curl -fsS https://aa.xxx.com/api/health
```

---

## 8. 验证

```bash
curl -fsS https://aa.xxx.com/api/health
curl -I https://aa.xxx.com/zh
curl -I https://aa.xxx.com/en
```

浏览器：

```text
https://aa.xxx.com/zh
https://aa.xxx.com/en
```

检查：

- 中文/英文首页
- 语言切换
- 同一标准中英文详情互跳
- 搜索、分类筛选、图片预览
- 后台登录 `/login`
- 上传中文/英文文档

---

## 9. 备份

```bash
cd /home/ubuntu/quality-iqc
./scripts/backup.sh
```

定时任务：

```bash
crontab -e
30 2 * * * cd /home/ubuntu/quality-iqc && ./scripts/backup.sh >> /var/log/quality-iqc-backup.log 2>&1
```

---

## 10. 常见问题

### `.env not found`

```bash
cd /home/ubuntu/quality-iqc
cp .env.production.example .env
chmod 600 .env
```

### `docker-compose.prod.yml: no such file`

server 配置包没有解压到 `/home/ubuntu/quality-iqc`：

```bash
tar -xzf /tmp/quality-iqc-server-1.1.0.tar.gz \
  -C /home/ubuntu/quality-iqc
```

### `exec format error`

镜像不是 amd64：

```bash
docker image inspect quality-iqc-api:1.1.0 --format '{{.Os}}/{{.Architecture}}'
```

必须是 `linux/amd64`。

### 域名仍是 NXDOMAIN

DNS A 记录还没生效。检查：

```bash
dig +short aa.xxx.com
```

### 80 被其他项目占用

本配置不会停止现有 Nginx，也不会启动第二个 80 监听，只会添加：

```text
server_name aa.xxx.com;
```

如果 `nginx -t` 报端口冲突，请先检查现有 Nginx 是否重复配置了 `default_server` 或同一 `server_name`。
