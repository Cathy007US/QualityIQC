# 本地

```bash
cd frontend && npm run dev        # ① 起前端开发服务（5173，热更新）
# 后端本地：uvicorn app.main:app --reload（在 backend/ 下，8000）
```
改代码 → 浏览器看效果 → 满意后按下面场景发布。

或者直接用新架构在本地跑全套（自带 PG）：
```bash
# 见 README / 本文末尾「本地跑全套」

./scripts/deploy.sh seed --local  # 空库时灌 12 条示例文档（6 中 + 6 英），幂等
```

## 只改了前端（页面 / 样式 / logo）
```bash
./scripts/deploy.sh frontend       # 构建 → 打包(约400KB) → 上传 → 解压生效
```
服务器：什么都不用做（静态文件挂载即生效，无需重启）。

## 只改了后端（接口 / 逻辑 / 中间件）
```bash
./scripts/deploy.sh backend        # 上传 app 源码 → --force-recreate api → 健康检查
```
服务器：什么都不用做（脚本已自动重建容器）。
注意：Python 源码靠挂载，容器不重建不会加载新代码；手动改服务器文件时记得自己
`docker compose -f docker-compose.prod.yml up -d --force-recreate api`。

## 改了账号密码 / 域名 / 库配置
```bash
vi iqc-api.env                      # 所有账号密码都在这一个文件
./scripts/deploy.sh config          # 上传 env → 自动生成 DATABASE_URL → 重建 api → 验证读库
```
规则：
- `POSTGRES_PASSWORD` 改了，脚本会自动 `ALTER USER`（数据卷不动，数据不丢）
- `DATABASE_URL` 不要手改，脚本按 `POSTGRES_*` 自动生成（主机固定 `db`）
- `CORS_ORIGINS` 换成真实域名，多个用逗号分隔

## 空库起步 / 想加示例文档
```bash
./scripts/deploy.sh seed            # 从 samples/ 导入 12 条示例标准文档（幂等，已存在跳过）
./scripts/deploy.sh seed --local    # 本地测试：对本机 8088 导入
```
注意：如果执行了 `migrate` 迁旧数据，就不用再 `seed`（旧库里已有真实数据）。

## 迁旧数据（首次从老架构切过来）
```bash
./scripts/deploy.sh migrate         # 旧外部 pg → 新自带 db；详见 MIGRATE.md
```

## 万不得已：全量覆盖
怀疑服务器状态混乱时，一次性对齐本地与服务器：
```bash
./scripts/deploy.sh init            # 覆盖 compose/nginx.conf/前端产物/构建上下文并重建全部容器
./scripts/deploy.sh config          # env 文件单独同步（init 不覆盖它，防冲掉线上密码）
# 然后 migrate 或 seed 二选一
./scripts/deploy.sh status
```

## 验收
```bash
./scripts/deploy.sh status          # 容器状态 + web/api/db 健康检查
```
浏览器 `Cmd+Shift+R` 强刷（或无痕窗口）绕过缓存。

# 服务器

## 免密登录（本地只需配一次）
```bash
ls ~/.ssh/id_ed25519.pub 2>/dev/null && echo "已有密钥" || ssh-keygen -t ed25519
ssh-copy-id ubuntu@IP
ssh ubuntu@IP "echo 免密OK && hostname"     # 验证

./scripts/deploy.sh ssh                      # 从本地进入服务器项目目录（exit 回来）
```

## 本地跑全套（自带 PG，验证新架构）
```bash
# 1) 填配置（首次）：cp iqc-api.env.example iqc-api.env && vi iqc-api.env
#    CORS_ORIGINS 用 http://127.0.0.1:8088
# 2) 准备挂载目录：
cd frontend && npm run build && cd ..
rm -rf runtime/frontend/assets && cp -R frontend/dist/. runtime/frontend/
cp -R backend/app/. runtime/backend/app/
find runtime/backend/app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
# 3) 启动：
docker compose -f docker-compose.prod.yml up -d --build
# 4) 灌数据：
./scripts/deploy.sh seed --local
# 5) 打开 http://127.0.0.1:8088/zh
```

## 常用本地运维
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml down        # 停（数据卷保留）
docker compose -f docker-compose.prod.yml down -v     # 停并清空数据（回到全新空库，需重新 seed）
```
