# 数据迁移：外部 PG → 自带 PG

新架构把 PostgreSQL 纳入了项目自己的 compose（`db` 服务），不再连服务器外部的 `pg` 容器。
原有 `iqc_insp` 库里的数据需要通过 `deploy.sh migrate` 迁一次。

## 迁移内容

| 数据 | 位置 | 是否迁移 | 说明 |
|---|---|---|---|
| 业务数据（文档/分类/用户/版本/审计） | 外部 `pg` 容器的 `iqc_insp` 库 | ✅ 迁移 | 用 `pg_dump`/`pg_restore`，表、数据、索引全保留 |
| 上传的原文件 | Docker 卷 `quality-iqc_iqc_uploads` | ✅ 自动保留 | 新 compose 沿用同名卷，文件天然就在，无需操作 |

## 执行步骤

前置：`init` 已完成（新 `db` 容器已能启动）、`.deploy.env` 已填好。

### 1. 确认旧库容器名和库信息

旧库容器名从 `docker ps` 看，通常是 `pg`；库名 `iqc_insp`，用户 `iqc_user`。

```bash
ssh ubuntu@你的IP "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -i postgres"
```

### 2. 执行迁移（本地执行）

默认参数（旧容器 `pg`、库 `iqc_insp`、用户 `iqc_user`）直接跑：

```bash
./scripts/deploy.sh migrate
```

如果旧容器名/库名/用户不同，按顺序传入：

```bash
./scripts/deploy.sh migrate <旧容器名> <旧库名> <旧用户名>
# 例：./scripts/deploy.sh migrate pg16 iqc_insp iqc_user
```

脚本会依次：
1. 在旧容器里 `pg_dump -Fc` 导出到服务器 `/tmp/iqc-migrate.dump`
2. 确保新 `db` 容器启动并就绪
3. `pg_restore --clean --if-exists` 导入到新库（已有同表会先删再建）
4. 重建 api、跑健康检查

### 3. 验收

```bash
./scripts/deploy.sh status
```

然后浏览器打开首页，确认：分类、文档数量、最近更新、搜索结果、文档详情预览、下载都正常。

## 常见问题

**`pg_dump: error: role "iqc_user" does not exist`**
旧库用户不是 `iqc_user`，用第三个参数传正确用户名。

**`pg_restore: error: connection to database failed`**
新 `db` 没起来，先 `./scripts/deploy.sh status` 看 db 状态；或确认 `iqc-api.env` 里 `POSTGRES_*` 已填对，再 `./scripts/deploy.sh config`。

**迁移后 api 报 `relation does not exist`**
导入顺序或库不匹配。确认第二个参数是 `iqc_insp`；可重跑一次 `migrate`（`--clean` 幂等）。

**想回滚**
旧 `pg` 容器保持运行、旧数据未动，随时可以把 compose 指回旧库；新库是独立卷 `quality-iqc_pgdata`，删掉即回到全新状态。

## 空库起步（不迁旧数据）

新库不会自动带示例文档。如果想用 `samples/` 里的 6 条中文 + 6 条英文示例标准文档起步：

```bash
./scripts/deploy.sh seed           # 幂等，已存在会跳过
./scripts/deploy.sh seed --local   # 本地测试时对 8088 导入
```

注意：`migrate` 和 `seed` 二选一即可。迁了旧数据就别再 seed（旧库已有真实文档）。

## 迁移完成后的日常发布

只改前端：`./scripts/deploy.sh frontend`（几秒，免重启）
只改后端：`./scripts/deploy.sh backend`（传源码 + 重建 api）
改了账号密码：`./scripts/deploy.sh config`
灌示例文档：`./scripts/deploy.sh seed`（幂等）
全量对齐：`./scripts/deploy.sh all`
