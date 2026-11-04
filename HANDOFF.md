# quality-Iqc 交付说明

## 当前状态

- 前台与后台已切换为太阳能 / 光伏 IQC 语境，版本 `1.1.0`
- 已支持 `/zh` / `/en` 双语前台、同编号中英文文档与分类翻译；后台界面保持中文，支持中英文上传与筛选
- Word / Excel 内嵌图片已支持抽取、存储和详情页还原
- 注意：图片功能上线前已上传的旧文档，需要重新上传或执行“替换文件”才能恢复图片
- 本地 Docker 全栈已构建并运行：`http://localhost:8088`
- API 健康检查：`http://localhost:8088/api/health`
- OpenAPI：`http://localhost:8088/api/docs`
- 本地数据库容器：`quality-iqc-db-1`，宿主机端口 `5435`
- 已导入 6 份中文 + 6 份英文光伏 IQC 演示标准，覆盖电池片、玻璃、胶膜、边框、接线盒、焊带辅材（Word / Excel / PDF）
- 本次双语迁移为无损升级，保留了此前上传的 `EL检验标准`，没有执行数据库重置
- 已完成桌面端、移动端浏览器渲染与完整管理流程验证
- 按你的选择：**本次不执行服务器上传/部署**，交付可部署代码包与指南

本地默认管理员（仅本地 `.env`）：

```text
admin / Admin@123456
```

生产环境请勿沿用该密码。

## 已生成的镜像部署产物

```text
dist-packages/quality-iqc-images-1.1.0.tar.gz
  linux/amd64 API + Web 合并镜像包，约 101 MB
  SHA256 8ab9fa7f2afeb6ef25ac5f497de56a0f2393d867a683d7275bd8b2208161ef49

dist-packages/quality-iqc-server-1.1.0.tar.gz
  docker-compose.prod.yml + .env 示例 + Nginx + 备份脚本
  SHA256 516bda485f28aa4c01bb55abc909b6850c7d16d16cd718b8cf046f60b9182c96
```

服务器部署步骤见 [DEPLOY_IMAGES.md](DEPLOY_IMAGES.md)。

## 生产配置中需要你补充的信息

- 现有 PostgreSQL 的 `iqc_insp` 库账号与密码
- 数据库从应用容器可访问的主机（`host.docker.internal` 或现有 pg 容器名）
- 最终域名（当前 `iqc.xx.com` 为占位）与 DNS 解析
- Let's Encrypt 通知邮箱

生产 `SECRET_KEY` 与管理员密码已单独生成，见交付对话，不要写入代码仓库。

## 生产部署（推荐镜像流程）

**不要在 2GB 服务器上现场 build，也不要在 Apple Silicon 上保存默认架构镜像。** 完整说明见 [DEPLOY_IMAGES.md](DEPLOY_IMAGES.md)。

本地：

```bash
cd quality-Iqc
./scripts/build-images.sh 1.1.0
# 生成：
# dist-packages/quality-iqc-images-1.1.0.tar.gz
# dist-packages/quality-iqc-server-1.1.0.tar.gz
```

上传：

```bash
rsync -avP dist-packages/quality-iqc-images-1.1.0.tar.gz root@SERVER_IP:/tmp/
rsync -avP dist-packages/quality-iqc-server-1.1.0.tar.gz root@SERVER_IP:/tmp/
```

服务器：

```bash
gunzip -c /tmp/quality-iqc-images-1.1.0.tar.gz | docker load
docker image inspect quality-iqc-api:1.1.0 --format '{{.Os}}/{{.Architecture}}'
# 必须是 linux/amd64

sudo mkdir -p /opt/quality-iqc
sudo tar -xzf /tmp/quality-iqc-server-1.1.0.tar.gz -C /opt/quality-iqc
cd /opt/quality-iqc
cp .env.production.example .env
chmod 600 .env
vi .env
# 填 DATABASE_URL、SECRET_KEY、ADMIN_PASSWORD、CORS_ORIGINS
# 若 PostgreSQL 未发布 5432，使用 docker-compose.prod-pg-network.yml

docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:8088/api/health
```

域名和 HTTPS 配置仍使用 `deploy/nginx-host.conf` + certbot，详见 [DEPLOY_IMAGES.md](DEPLOY_IMAGES.md) 第 8 节。

源码现场构建方式保留在 [DEPLOY.md](DEPLOY.md)，但不推荐用于 2GB 生产服务器。

域名未解析前，可先用 `http://SERVER_IP:8088` 验证应用；生产环境建议通过安全组限制 8088 仅允许必要来源，最终只暴露 80/443。

## 验收清单

- [ ] `/api/health` 返回 `"database":"ok"`
- [ ] `/zh`、`/en` 首页、统计、分类、最近更新正常
- [ ] 同一标准中英文详情可通过语言按钮互跳
- [ ] 文库搜索、分类筛选、分页正常
- [ ] Word 表格、Excel 工作表、PDF 文本可预览
- [ ] Word / Excel 内嵌图片在详情页正常还原，点击可查看原图
- [ ] 原文件下载成功，下载次数增加
- [ ] 管理员可上传、替换、查看历史版本、下架
- [ ] 手机端页面正常
- [ ] HTTPS 证书自动续期 `certbot renew --dry-run` 通过

## 本地已执行验证

- `scripts/smoke_test.sh`：通过
- 管理员登录 / 401 未授权上传 / 错误密码：通过
- 数据库 `documents.locale` 无损迁移，现有中文文档保留：通过
- 6 份英文标准导入、同编号中英文并存：通过
- DOCX / XLSX / PDF 上传与解析：通过
- Word / Excel 内嵌图片抽取、存储、读取与页面还原：通过（含替换后旧资产清理）
- 中英文全文检索、分类筛选、详情、下载：通过
- `/zh`、`/en` 路由与语言切换、等同文档互跳：通过
- 后台上传语言选择、英文文档筛选、分类英文名称：通过
- 重复文件 409、文件替换 v1→v2、历史版本下载：通过
- Playwright：分类创建/删除、上传、详情、替换弹窗、文档下架全流程通过，无前端控制台错误
- `backup.sh`：数据库与上传文件备份成功
- 前端 `npm run build`：通过
- 后端 `ruff check`：通过
