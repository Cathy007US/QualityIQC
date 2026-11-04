# quality-Iqc · 太阳能 IQC 检验标准知识库

面向光伏组件工厂来料检验（IQC）场景的中英文双语标准知识库。集中管理电池片、光伏玻璃、封装胶膜、铝边框、接线盒与焊带辅材的检验规范、作业指导书、抽样方案和检验表单，支持中英文公开检索、在线预览、原文件下载，以及登录后的上传、替换、版本追溯与下架管理。

> 当前阶段：**不包含**向量化、Embedding、RAG、Milvus、pgvector、Elasticsearch、Redis。单机 2GB 内存可运行。

## 功能

**公开浏览**
- `/zh` 中文站与 `/en` 英文站，顶栏一键切换
- 电池片、玻璃、胶膜、边框、接线盒、焊带辅材六大光伏物料分类（中英文名称）
- 标题、编号、摘要、正文、标签、供应商、产线全文关键词检索（PostgreSQL `ILIKE`）
- 分类、文档类型筛选，更新时间 / 下载量 / 标题排序，按当前语言隔离
- Word / Excel / PDF 自动解析为结构化内容，在线预览段落、列表、表格、分页与内嵌图片
- 原文件下载，下载次数统计

**管理端**
- JWT + bcrypt 登录，仅上传、编辑、替换、下架需要鉴权
- 拖拽上传，自动解析正文、摘要、段落数、表格数与内嵌图片
- 文档元数据维护、文件替换并生成新版本、历史版本下载
- 中英文文档独立上传、独立版本与下载计数，同编号自动组成一组
- 分类中英文名称与说明维护
- 审计日志（登录、上传、替换、更新、删除、分类操作）
- 重复文件 SHA-256 检测、文件类型/大小/压缩包安全校验

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vite 5 + React 18 + TypeScript + TailwindCSS 3 + React Router v6 + lucide-react |
| 后端 | Python 3.11 + FastAPI + Uvicorn + SQLAlchemy 2 + Pydantic v2 |
| 数据库 | PostgreSQL 16（独立库 `iqc_insp`） |
| 文档解析 | python-docx / openpyxl / pypdf |
| 鉴权 | JWT（PyJWT）+ bcrypt |
| 部署 | Docker Compose + Nginx + 宿主机 Nginx/HTTPS |

## 目录结构

```
quality-Iqc/
├── backend/
│   ├── app/
│   │   ├── api/            # public / auth / admin 路由
│   │   ├── services/       # 文档解析、存储、种子数据
│   │   ├── models.py       # SQLAlchemy 模型
│   │   ├── schemas.py      # Pydantic 模型
│   │   ├── security.py     # JWT / bcrypt / 登录限流
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/          # 公开页面 + admin 页面
│   │   ├── components/
│   │   ├── api/
│   │   ├── auth/
│   │   └── lib/
│   ├── nginx.conf          # 容器内 Nginx（SPA + /api 反代）
│   └── Dockerfile
├── deploy/nginx-host.conf  # 宿主机 Nginx 示例
├── samples/                # 可选的演示文档
├── scripts/                # 冒烟测试、演示数据、打包、部署、备份
├── docker-compose.yml
├── docker-compose.pg-network.yml
├── .env.local.example
├── .env.production.example
└── Makefile
```

## 本地快速开始（Docker，完整栈）

环境要求：Docker Desktop / Docker Engine + Compose v2。

```bash
cd quality-Iqc
cp .env.local.example .env

# 重要：修改 .env 中的 SECRET_KEY 和 ADMIN_PASSWORD
openssl rand -hex 32          # 生成 SECRET_KEY

make local                    # 等同 docker compose --profile local-db up -d --build
```

本地栈端口：

| 服务 | 地址 |
| --- | --- |
| Web | http://localhost:8088 |
| API | http://localhost:8088/api |
| OpenAPI | http://localhost:8088/api/docs |
| PostgreSQL | `localhost:5435`（容器内 5432） |

本地使用独立的 `postgres:16-alpine` 容器，映射到宿主机 **5435**，不占用已有 PostgreSQL 的 5432。生产环境复用现有 5432，见 [DEPLOY.md](DEPLOY.md)。

默认本地管理员（以 `.env` 为准）：

```text
用户名：admin
密码：Admin@123456
```

首次启动会自动建表，写入 6 个光伏物料分类及中英文翻译，并创建管理员。**上线前必须修改密码。** 后台管理界面保持中文，但支持中英文文件上传与筛选。

### 导入演示文档

```bash
./scripts/seed_samples.sh
# 或指定地址
./scripts/seed_samples.sh http://localhost:8088
```

会依次上传 12 份光伏 IQC 示例标准：6 份中文 + 6 份英文，覆盖 Word、Excel、PDF 三种格式和全部物料分类。重复执行会自动跳过相同内容。英文文件使用相同标准编号（如 `PV-IQC-WI-001`），但独立存储和版本管理。

### 冒烟测试

```bash
./scripts/smoke_test.sh
# 或
make smoke
```

## 本地开发（不使用 Docker 运行前后端）

### 后端

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

export DATABASE_URL='postgresql+psycopg://iqc:password@127.0.0.1:5432/iqc_insp'
export SECRET_KEY="$(openssl rand -hex 32)"
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

Vite 开发服务器运行在 `http://localhost:5173`，`/api` 自动代理到 `http://127.0.0.1:8000`。

### 构建检查

```bash
cd frontend && npm run build
cd ../backend && python -m compileall -q app
```

## 配置项

配置来自环境变量 / `.env`：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 本地 db | SQLAlchemy + psycopg 连接串 |
| `SECRET_KEY` | 开发占位 | JWT 签名密钥，生产必须为随机 64 hex |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | 登录有效期（分钟） |
| `ADMIN_USERNAME` | `admin` | 首次启动创建的管理员 |
| `ADMIN_PASSWORD` | `Admin@123456` | 首次创建时的密码；已存在不会覆盖 |
| `ADMIN_DISPLAY_NAME` | `光伏质量部管理员` | 页面显示名称 |
| `MAX_UPLOAD_MB` | `25` | 单文件上限 |
| `UPLOAD_DIR` | `uploads` | 文件存储目录（容器内 `/app/uploads`） |
| `CORS_ORIGINS` | 本地地址 | 逗号分隔；生产为 `https://iqc.xx.com` |
| `WEB_PORT` | `8088` | Web 容器映射到宿主机的端口 |
| `DB_PORT` | `5435` | 本地数据库映射端口 |

## 数据模型

- `users`：管理员账号、bcrypt 哈希、最后登录时间
- `categories`：中文分类名称、slug、颜色、排序
- `category_translations`：分类的英文名称与说明（`category_id + locale` 唯一）
- `documents`：编号、语言 `locale`、标题、分类、类型、版本、标签、有效期、文件信息、解析文本 / JSONB 块、下载次数
  - `document_no + locale` 唯一：同一标准编号可有中文、英文两条独立受控文档
  - 中文/英文各自拥有修订号、版本历史、图片资产与下载次数
- `document_assets`：Word / Excel 内嵌图片的文件信息、尺寸、MIME 与排序
- `document_versions`：每次替换生成完整快照，含文件与解析内容
- `audit_logs`：登录、上传、替换、更新、删除、分类操作

文档文件与抽取出的图片保存在 Docker volume `iqc-insp_iqc_uploads`（为兼容历史数据保留的卷名），数据库中保存相对文件名。替换文件会保留旧版本原文件，同时更新预览图片；历史版本原文件仍可下载。

## API 概览

```text
GET    /api/health
GET    /api/stats?lang=zh-CN|en-US
GET    /api/categories?lang=zh-CN|en-US
GET    /api/documents?lang=&q=&category=&doc_type=&sort=&page=&page_size=
GET    /api/documents/{id}?lang=zh-CN|en-US
GET    /api/documents/{id}/related?lang=zh-CN|en-US
GET    /api/documents/{id}/download
GET    /api/documents/{id}/assets/{asset_id}   # 内嵌图片

POST   /api/auth/login
GET    /api/auth/me

GET    /api/admin/overview
GET    /api/admin/documents
POST   /api/admin/documents                 # multipart 上传
PATCH  /api/admin/documents/{id}
POST   /api/admin/documents/{id}/replace    # multipart 替换
DELETE /api/admin/documents/{id}            # 软删除/下架
GET    /api/admin/documents/{id}/versions
GET    /api/admin/documents/{id}/versions/{version_id}/download
GET    /api/admin/categories
POST   /api/admin/categories
PATCH  /api/admin/categories/{id}
DELETE /api/admin/categories/{id}
```

公开接口通过 `lang` 查询参数（也兼容 `Accept-Language`）返回对应语言的数据和分类名称；同一份文档的详情会返回 `alternate_document_id`，用于中英文版本直接跳转。

前台页面：

```text
/zh                     中文首页
/en                     英文首页
/zh/documents           中文标准文库
/en/documents           英文标准文库
/zh/documents/{id}      中文详情
/en/documents/{id}      英文详情
```

完整交互文档：`/api/docs`。

## 文档解析说明

| 格式 | 处理方式 | 限制 |
| --- | --- | --- |
| `.docx` | 按标题层级、段落、列表、表格还原，并抽取正文/表格内嵌图片 | 不解析页眉页脚、文本框内图片；不做图片 OCR |
| `.xlsx` | 每个可见工作表转为标题 + 表格，并抽取工作表中的图片 | 最多 500 行 × 40 列 / 表；图片追加在对应工作表后 |
| `.pdf` | pypdf 提取可复制文本，按页切分 | 扫描件无法识别，请先 OCR；最多 400 页 |

图片限制：最多 80 张，单张 12MB，总计 64MB；支持 PNG / JPEG / GIF / WebP，BMP/TIFF 自动转 PNG，EMF/WMF 等浏览器不兼容格式会跳过并计入 `image_skipped`。图片以受控文档资产形式存储，公开访问前会校验文档是否已发布。

> 图片抽取从 v1.1 起生效。此前上传的文档若未保存图片资产，需要重新上传或在管理端使用“替换文件”重新解析。

安全限制：单文件 25MB；校验文件头；Office 压缩包总解压体积不超过 250MB、条目数不超过 5000；重复 SHA-256 文件拒绝上传。

## 安全说明

- 浏览公开，写操作全部需要 Bearer Token
- 密码 bcrypt cost 12；密码超过 72 字节会被拒绝
- 登录失败限流：同一 IP + 用户名 15 分钟内 8 次
- 上传文件名清洗，服务端使用 UUID 存储名；下载与图片响应设置 `nosniff`，图片仅能通过已发布文档的资产接口读取
- 生产必须替换 `SECRET_KEY` / 管理员密码，`.env` 权限设置为 `600`
- 建议只在宿主机监听 `127.0.0.1:8088`，由宿主机 Nginx 终止 TLS；当前 Compose 默认映射到所有网卡，可通过防火墙限制 8088 仅本机访问

## 部署

生产环境推荐**本地构建 linux/amd64 镜像、上传镜像包、服务器只 load 运行**，避免 ARM Mac 镜像在 x86 服务器上报 `exec format error`，也避免 2GB 服务器现场构建 OOM。

完整命令见 [DEPLOY_IMAGES.md](DEPLOY_IMAGES.md)。最短流程：

```bash
# 本地（Apple Silicon 也适用）
./scripts/build-images.sh 1.1.0

# 上传到服务器
rsync -avP dist-packages/quality-iqc-images-1.1.0.tar.gz root@SERVER:/tmp/
rsync -avP dist-packages/quality-iqc-server-1.1.0.tar.gz root@SERVER:/tmp/

# 服务器
gunzip -c /tmp/quality-iqc-images-1.1.0.tar.gz | docker load
mkdir -p /opt/quality-iqc
tar -xzf /tmp/quality-iqc-server-1.1.0.tar.gz -C /opt/quality-iqc
cd /opt/quality-iqc
cp .env.production.example .env
chmod 600 .env
vi .env
docker compose -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` 只使用已 `docker load` 的镜像，不会在服务器 build，也不会从 Docker Hub 拉取。源码方式仍保留在 [DEPLOY.md](DEPLOY.md)，但不作为首选。

宿主机 Nginx 反向代理 `127.0.0.1:8088`，使用 certbot 签发 `iqc.xx.com` 证书。

## 常用命令

```bash
make local       # 构建并启动本地完整栈
make ps          # 容器状态
make logs        # 跟踪日志
make down        # 停止
make smoke       # 冒烟测试
make package     # 生成部署包（不含 .env / 上传文件）
make backup      # 备份数据库与上传文件
```

## 本阶段明确不做

- 向量化、Embedding、RAG
- Milvus、pgvector、Elasticsearch、Redis
- OCR / 扫描件识别
- 多租户、审批流、SSO

## 已验证范围

本地 Docker 全栈已完成以下验证：

- 服务健康检查、数据库建表与种子数据
- 管理员登录、错误密码与未授权上传拦截
- 6 份中文 + 6 份英文光伏标准的 DOCX / XLSX / PDF 上传与结构化解析
- 同编号中英文文档并存、语言过滤、等同文档切换（`alternate_document_id`）
- Word / Excel 内嵌图片抽取、公开读取与详情页还原展示
- 文件替换后旧图片资产清理，新图片 URL 生效
- 中英文关键词检索、分类筛选、详情与下载
- 重复文件拦截、文件替换、版本历史与历史版本下载
- `/zh`、`/en` 路由、语言切换、分类中英文名称
- 后台中英文上传、语言筛选、分类英文名称维护
- 前台 / 管理端桌面与移动端页面渲染
