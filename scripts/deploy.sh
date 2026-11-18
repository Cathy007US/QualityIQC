#!/usr/bin/env bash
# ============================================================
# quality-Iqc 一键发布脚本（对齐 BookHealth 的「小包发布」模式）
#
# 核心思路：
#   前端 = 官方 nginx 镜像 + 挂载静态目录 → 改前端只传静态文件，免重启
#   后端 = 基础镜像（固化 pip 依赖）+ 挂载源码 → 改后端只传源码，重建容器
#   PG   = 自带 db 容器 → 不再依赖外部 pg 网络，根治解析/连接踩坑
#   每次发布都是几百 KB 的小包，不再传 100MB+ 的镜像
#
# 用法：
#   ./scripts/deploy.sh frontend       # 只发布前端（页面/样式/logo）
#   ./scripts/deploy.sh backend        # 只发布后端（接口/逻辑/依赖外的代码）
#   ./scripts/deploy.sh all            # 前后端都发（默认）
#   ./scripts/deploy.sh config         # 同步 iqc-api.env（账号/密码/库配置）并重建
#                                        （会自动重建 admin 密码哈希，改密码后跑它即可）
#   ./scripts/deploy.sh password       # 单独重建 admin 密码哈希（库里哈希与 env 不同步时）
#   ./scripts/deploy.sh init           # 首次部署：建目录+传配置+构建镜像+启动
#   ./scripts/deploy.sh migrate        # 把旧外部 PG 的 iqc_insp 数据迁到自带 db
#   ./scripts/deploy.sh seed           # 导入 samples/ 里的示例标准文档（幂等，已存在跳过）
#   ./scripts/deploy.sh seed --local   # 对本机 http://127.0.0.1:8088 导入（本地测试用）
#   ./scripts/deploy.sh sql <file.sql> # 在自带 db 执行一个 SQL 迁移文件
#   ./scripts/deploy.sh status         # 容器状态 + 健康检查
#   ./scripts/deploy.sh logs [服务名]   # 跟踪日志，默认 api
#   ./scripts/deploy.sh ssh            # 进入服务器项目目录
#
# 参数：
#   --no-build   跳过本地构建，直接上传已有 dist（少用）
#   --local      seed 专用：对本机 8088 导入，不走 SSH（本地测试）
#
# 首次使用：
#   1) cp .deploy.env.example .deploy.env  填服务器地址
#   2) cp iqc-api.env.example iqc-api.env  填好所有账号密码/域名
#   3) ./scripts/deploy.sh init
#   4) 二选一：./scripts/deploy.sh migrate  （迁旧数据）
#              ./scripts/deploy.sh seed     （空库起步，灌示例文档）
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------------- 配置 ----------------
if [ -f "$ROOT/.deploy.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.deploy.env"
  set +a
fi
SERVER="${SERVER:-}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/quality-iqc}"
SSH_KEY="${SSH_KEY:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-iqc-api.env}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
[ -n "$SSH_KEY" ] && SSH_OPTS+=(-i "$SSH_KEY")

CMD="${1:-all}"
shift || true
NO_BUILD=0
SKIP_CHECK=0
LOCAL=0
ARG=""
for a in "$@"; do
  case "$a" in
    --no-build) NO_BUILD=1 ;;
    --local)    LOCAL=1 ;;
    *) ARG="$a" ;;
  esac
done

# ---------------- 输出 ----------------
log()  { printf '\033[36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

need_server() {
  [ -n "$SERVER" ] || die "未配置服务器。复制 .deploy.env.example 为 .deploy.env，填入 SERVER=ubuntu@你的IP"
}

remote()   { ssh "${SSH_OPTS[@]}" "$SERVER" "set -e; cd '$REMOTE_DIR'; $*"; }
put()      { scp "${SSH_OPTS[@]}" -q "$1" "$SERVER:$REMOTE_DIR/$2"; }
rc()       { remote "docker compose -f '$COMPOSE_FILE' $*"; }

# 读取本地配置文件某个值（不 source，避免密码里的特殊字符被 shell 解释）
env_get() { awk -F= -v k="$1" '$1==k{sub(/^[^=]*=/,""); print; exit}' "$ENV_FILE" 2>/dev/null | tr -d '\r'; }
# SQL 字符串字面量：单引号翻倍
sql_lit() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"; }
# URL 编码：把密码里的 @ : / # ? % 等编码，供 DATABASE_URL 使用
urlenc()  { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$1" 2>/dev/null || printf '%s' "$1" | sed -e 's/%/%25/g' -e 's/@/%40/g' -e 's/:/%3A/g' -e 's|/|%2F|g' -e 's/#/%23/g' -e 's/?/%3F/g'; }

# 服务器上 ENV_FILE 的某个值（文件不存在返回空）
remote_env_get() {
  remote "sed -n 's/^$1=//p' '$ENV_FILE' 2>/dev/null | tail -1 | tr -d '\r'" 2>/dev/null || true
}

# 由 POSTGRES_* 生成正确的 DATABASE_URL（主机固定 db），写回本地 ENV_FILE
sync_database_url() {
  [ -f "$ENV_FILE" ] || die "缺少 $ENV_FILE，请先从 iqc-api.env.example 复制并填写"
  local db user pass url tmp
  db="$(env_get POSTGRES_DB)";     db="${db:-iqc_insp}"
  user="$(env_get POSTGRES_USER)"; user="${user:-iqc_user}"
  pass="$(env_get POSTGRES_PASSWORD)"
  [ -n "$pass" ] || die "$ENV_FILE 里 POSTGRES_PASSWORD 为空"
  url="postgresql+psycopg://${user}:$(urlenc "$pass")@db:5432/${db}"
  tmp="$(mktemp -t iqc-env).env"
  awk -v u="$url" '
    /^DATABASE_URL=/ { next }
    { print }
    END { print "DATABASE_URL=" u }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
  ok "DATABASE_URL 指向自带 db（主机 db，密码已 URL 编码）"
}

# ---------------- 本地构建 ----------------
build_frontend() {
  [ "$NO_BUILD" = "1" ] && { warn "跳过前端构建"; return; }
  log "构建前端（vite build）"
  ( cd frontend && npm run build ) || die "前端构建失败，先修好再发"
  [ -f frontend/dist/index.html ] || die "frontend/dist/index.html 不存在"
  # 版本戳写进 index.html，线上 curl 一下就能核对是不是最新版
  local stamp; stamp="$(date +%Y%m%d-%H%M%S)"
  sed -i '' "s#<head>#<head><meta name=\"build-version\" content=\"$stamp\">#" frontend/dist/index.html
  ok "前端版本戳: $stamp"
  ok "前端产物 $(du -sh frontend/dist | cut -f1)"
}

# ---------------- 打包 ----------------
pack_frontend() {
  TMP_FE="$(mktemp -t iqc-fe).tar.gz"
  # COPYFILE_DISABLE + --format=ustar 防止 macOS 的 ._ 资源文件/pax 扩展属性
  COPYFILE_DISABLE=1 tar czf "$TMP_FE" --format=ustar -C frontend/dist .
  ok "前端压缩包 $(du -h "$TMP_FE" | cut -f1)"
}

pack_backend() {
  TMP_BE="$(mktemp -t iqc-be).tar.gz"
  COPYFILE_DISABLE=1 tar czf "$TMP_BE" --format=ustar -C backend app
  ok "后端源码包 $(du -h "$TMP_BE" | cut -f1)"
}

# ---------------- 发布动作 ----------------
web_port() { local p; p="$(env_get WEB_PORT)"; printf '%s' "${p:-8088}"; }

deploy_frontend() {
  need_server
  build_frontend
  pack_frontend
  log "上传前端到 $SERVER:$REMOTE_DIR"
  put "$TMP_FE" .upload-frontend.tar.gz
  remote "mkdir -p runtime/frontend && cd runtime/frontend \
    && rm -rf assets.old \
    && if [ -d assets ]; then mv assets assets.old; fi \
    && tar xzf '../../.upload-frontend.tar.gz' \
    && rm -rf assets.old '../../.upload-frontend.tar.gz' \
    && find . -type d -exec chmod 755 {} + \
    && find . -type f -exec chmod 644 {} +"
  # nginx 容器用户要能读静态文件；仓库文件可能是 600
  rm -f "$TMP_FE"
  if [ "$SKIP_CHECK" = "1" ]; then return 0; fi
  # 静态文件挂载即生效，不需要重启容器
  remote "curl -fsS -o /dev/null http://127.0.0.1:$(web_port)/ && echo __OK__" | grep -q __OK__ \
    && ok "前端已生效（浏览器 Cmd+Shift+R 强刷查看）" \
    || warn "前端文件已上传，但本机 curl 未通过，执行 ./scripts/deploy.sh status 看看"
}

deploy_backend() {
  need_server
  pack_backend
  log "上传后端源码到 $SERVER:$REMOTE_DIR"
  put "$TMP_BE" .upload-backend.tar.gz
  remote "mkdir -p runtime/backend && tar xzf .upload-backend.tar.gz -C runtime/backend \
    && rm -f .upload-backend.tar.gz \
    && find runtime/backend/app -type d -exec chmod 755 {} + \
    && find runtime/backend/app -type f -exec chmod 644 {} +"
  # 关键：容器内 app 用户(uid 999)要能读源码。仓库文件可能是 600，
  # 不 chmod 会导致 PermissionError: /app/app/main.py，api 起不来。
  rm -f "$TMP_BE"
  if [ "$SKIP_CHECK" = "1" ]; then return 0; fi
  log "重建 api 容器（加载新源码）"
  rc "up -d --force-recreate api >/dev/null"
  sleep 3
  remote "curl -fsS http://127.0.0.1:$(web_port)/api/health && echo __OK__" | grep -q __OK__ \
    && ok "后端已生效" \
    || die "后端启动异常，执行 ./scripts/deploy.sh logs api 查看"
}

# 等自带 db 就绪
wait_db() {
  local i
  for i in $(seq 1 30); do
    if rc "exec -T db pg_isready -q" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  warn "数据库探测 30 次仍未就绪，继续尝试"
  return 0
}

deploy_config() {
  need_server
  sync_database_url

  local db_name db_user db_pass
  db_name="$(env_get POSTGRES_DB)";   db_name="${db_name:-iqc_insp}"
  db_user="$(env_get POSTGRES_USER)"; db_user="${db_user:-iqc_user}"
  db_pass="$(env_get POSTGRES_PASSWORD)"
  local secret admin_pass
  secret="$(env_get SECRET_KEY)";       admin_pass="$(env_get ADMIN_PASSWORD)"
  [ -n "$db_pass" ] || die "$ENV_FILE 里 POSTGRES_PASSWORD 为空"
  case "$secret" in
    ""|CHANGE_ME*) die "请先把 $ENV_FILE 的 SECRET_KEY 换成 openssl rand -hex 32 的输出" ;;
  esac
  case "$admin_pass" in
    ""|CHANGE_ME*) die "请先把 $ENV_FILE 的 ADMIN_PASSWORD 换成强密码" ;;
  esac

  # 读服务器旧值，判断改了什么
  local old_db old_user old_pass old_admin_pass
  old_db="$(remote_env_get POSTGRES_DB)";   old_db="${old_db:-$db_name}"
  old_user="$(remote_env_get POSTGRES_USER)"; old_user="${old_user:-$db_user}"
  old_pass="$(remote_env_get POSTGRES_PASSWORD)"
  old_admin_pass="$(remote_env_get ADMIN_PASSWORD)"

  log "备份服务器原配置 → ${ENV_FILE}.bak"
  remote "cp -f '$ENV_FILE' '${ENV_FILE}.bak' 2>/dev/null || true"
  put "$ENV_FILE" "$ENV_FILE"
  ok "已上传 $ENV_FILE"
  # compose 也一起同步（确保挂载/自带 db 的新结构生效）
  put "$COMPOSE_FILE" "$COMPOSE_FILE"

  local need_alter=0 need_db_recreate=0 changes=""
  if [ -n "$old_pass" ] && [ "$db_pass" != "$old_pass" ]; then
    need_alter=1; need_db_recreate=1; changes="${changes} 数据库密码\n"
  fi
  if [ "$db_name" != "$old_db" ]; then
    need_alter=1; need_db_recreate=1; changes="${changes} 库名 $old_db → $db_name\n"
  fi
  if [ "$db_user" != "$old_user" ]; then
    need_db_recreate=1; changes="${changes} 库用户 $old_user → $db_user\n"
    warn "库用户变更需要重建数据卷才彻底生效（POSTGRES_USER 只在初始化时创建角色）"
  fi

  if [ "$need_alter" = "1" ]; then
    log "先停 api（改库名/密码需要断开连接）"
    rc "stop api >/dev/null 2>&1 || true"
  fi
  if [ "$need_db_recreate" = "1" ]; then
    log "重建 db 容器（数据卷不动）"
    rc "up -d --force-recreate db >/dev/null"
  fi
  if [ "$need_alter" = "1" ] && [ -n "$old_pass" ]; then
    wait_db "$old_user"
    local sql_tmp; sql_tmp="$(mktemp -t iqc-db).sql"
    {
      echo '\set ON_ERROR_STOP on'
      if [ "$db_pass" != "$old_pass" ]; then
        printf 'ALTER USER "%s" WITH PASSWORD %s;\n' "$old_user" "$(sql_lit "$db_pass")"
      fi
      if [ "$db_name" != "$old_db" ]; then
        printf 'ALTER DATABASE "%s" RENAME TO "%s";\n' "$old_db" "$db_name"
      fi
    } > "$sql_tmp"
    log "改库内密码/库名"
    put "$sql_tmp" .upload-db.sql
    rm -f "$sql_tmp"
    remote "docker compose -f '$COMPOSE_FILE' exec -T db psql -U '$old_user' -d postgres -v ON_ERROR_STOP=1 < .upload-db.sql && rm -f .upload-db.sql"
    ok "库内密码/库名已更新"
  fi

  log "重建 api 容器（加载新配置）"
  rc "up -d --force-recreate api >/dev/null"
  sleep 3
  remote "curl -fsS http://127.0.0.1:$(web_port)/api/health >/dev/null" \
    || die "api 没起来，执行 ./scripts/deploy.sh logs api 看日志"
  ok "配置已生效（库 ${db_name} / 用户 ${db_user}）"
  [ -n "$changes" ] && printf '\033[33m  本次变更：%b\033[0m\n' "$changes"

  # 关键：seed_admin 对已存在的 admin 直接跳过，改 env 不会更新库里的密码哈希。
  # 上传 env 后必须显式重建哈希，否则 ADMIM_PASSWORD 改了却登不进去。
  if [ "$admin_pass" != "$old_admin_pass" ]; then
    deploy_reset_password "$admin_pass"
  fi
  return 0
}

# 重建 admin 密码哈希：用 env 里的 ADMIN_PASSWORD 重新 bcrypt 后写库。
# 因 seed_admin 对已存在用户 skip，改密码后必须调这个才生效（不动任何业务数据）。
# 传参 = 明文密码；不传则从本地 ENV_FILE 读。远程执行，密码经 stdin→容器环境变量传递，
# 不拼进 shell 字符串（避免 $ @ 等特殊字符被吞）。
deploy_reset_password() {
  need_server
  local admin_pass="${1:-}"
  if [ -z "$admin_pass" ]; then
    admin_pass="$(env_get ADMIN_PASSWORD)"
  fi
  case "$admin_pass" in
    ""|CHANGE_ME*) die "请先把 $ENV_FILE 的 ADMIN_PASSWORD 换成强密码" ;;
  esac
  local admin_user; admin_user="$(env_get ADMIN_USERNAME)"; admin_user="${admin_user:-admin}"
  local db_name db_user
  db_name="$(env_get POSTGRES_DB)";   db_name="${db_name:-iqc_insp}"
  db_user="$(env_get POSTGRES_USER)"; db_user="${db_user:-iqc_user}"

  log "重建 admin 密码哈希（用户 ${admin_user}，不改业务数据）"
  # 把密码写进一个临时文件经 scp 上服务器，再用 --env-file 无关的 -e 从文件读入容器，
  # 全程不明文出现在命令行/ssh 参数里。
  local PWF; PWF="$(mktemp -t iqc-pw)"
  printf '%s' "$admin_pass" > "$PWF"
  local TMP_SCRIPT; TMP_SCRIPT="$(mktemp -t iqc-resetpw).py"
  cat > "$TMP_SCRIPT" <<'PYEOF'
import os, sys
from app.database import SessionLocal
from app.models import User
from app.security import hash_password, verify_password
from sqlalchemy import select
p = os.environ["ADMIN_PW"]
user = os.environ.get("ADMIN_USER", "admin")
db = SessionLocal()
try:
    u = db.scalar(select(User).where(User.username == user))
    if u is None:
        print("NO_USER"); sys.exit(2)
    u.password_hash = hash_password(p)
    db.commit()
    print("OK" if verify_password(p, u.password_hash) else "MISMATCH")
finally:
    db.close()
PYEOF
  put "$PWF" .iqc-pw
  put "$TMP_SCRIPT" .iqc-resetpw.py
  rm -f "$PWF" "$TMP_SCRIPT"
  local result
  result="$(remote "PW=\$(cat .iqc-pw); docker compose -f '$COMPOSE_FILE' exec -T \\
    -e ADMIN_PW=\"\$PW\" -e ADMIN_USER='$admin_user' api python - < .iqc-resetpw.py; \\
    rm -f .iqc-pw .iqc-resetpw.py" | tail -1)"
  case "$result" in
    OK) ok "admin 密码哈希已重建，新密码可用" ;;
    NO_USER) die "库里找不到用户 '$admin_user'，请确认 ADMIN_USERNAME" ;;
    *) die "重建哈希失败（返回：$result），执行 ./scripts/deploy.sh logs api 看日志" ;;
  esac
}

deploy_init() {
  need_server
  sync_database_url
  log "首次部署：准备目录与配置"
  remote "mkdir -p runtime/frontend runtime/backend database deploy frontend backend \
    && rm -rf frontend/nginx.conf"
  put "$COMPOSE_FILE" "$COMPOSE_FILE"
  put frontend/nginx.conf frontend/nginx.conf
  # compose 里 api 用 build: ./backend，首次 --build 需要服务器上有构建上下文。
  # 这几个文件很少变，随 init 一并上传；以后改依赖再单独 put 即可。
  put backend/Dockerfile backend/Dockerfile
  put backend/requirements.txt backend/requirements.txt
  [ -f backend/.dockerignore ] && put backend/.dockerignore backend/.dockerignore
  # Dockerfile 里 COPY app ./app 作为兜底，构建上下文必须带一份 backend/app
  local ctx; ctx="$(mktemp -t iqc-ctx).tar.gz"
  COPYFILE_DISABLE=1 tar czf "$ctx" --format=ustar -C backend app
  put "$ctx" .upload-ctx.tar.gz
  remote "mkdir -p backend && tar xzf .upload-ctx.tar.gz -C backend \
    && rm -f .upload-ctx.tar.gz \
    && find backend/app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true"
  rm -f "$ctx"
  for f in database/*.sql; do
    [ -e "$f" ] && put "$f" "$f"
  done
  # 服务器上已有配置就不覆盖，避免冲掉线上密码
  if remote "[ -f '$ENV_FILE' ] && echo __EXISTS__" | grep -q __EXISTS__; then
    warn "服务器已有 $ENV_FILE，保持原样（要改配置用 ./scripts/deploy.sh config）"
  else
    put "$ENV_FILE" "$ENV_FILE"
    ok "已上传 $ENV_FILE"
  fi

  SKIP_CHECK=1
  deploy_frontend
  deploy_backend
  SKIP_CHECK=0

  log "启动全部服务（首次会构建后端基础镜像，装 pip 依赖，可能几分钟）"
  rc "up -d --build"
  sleep 5
  deploy_status
  echo
  log "下一步二选一（都不做则首页为空库）："
  echo "    迁旧数据：  ./scripts/deploy.sh migrate"
  echo "    灌示例文档：./scripts/deploy.sh seed"
}

deploy_migrate() {
  need_server
  local old_pg="${1:-pg}"
  local old_db="${2:-iqc_insp}"
  local old_user="${3:-iqc_user}"
  local new_db new_user
  new_db="$(env_get POSTGRES_DB)";   new_db="${new_db:-iqc_insp}"
  new_user="$(env_get POSTGRES_USER)"; new_user="${new_user:-iqc_user}"

  log "从旧 PG 容器 '${old_pg}' 导出库 '${old_db}'（用户 ${old_user}）"
  # 关键：pg_dump 的 stdout 重定向到「宿主机」文件，不能用 -f 写容器内 /tmp
  # （容器 /tmp 与宿主机隔离，后面 pg_restore 从宿主机读会找不到文件）
  remote "docker exec '$old_pg' pg_dump -U '$old_user' -d '$old_db' -Fc > /tmp/iqc-migrate.dump \
    && ls -lh /tmp/iqc-migrate.dump"
  log "导入到自带 db 容器（库 ${new_db}）"
  rc "up -d db >/dev/null"
  wait_db
  # 若目标库里已有同表（应用首次启动建过），--clean 先删再建
  remote "docker compose -f '$COMPOSE_FILE' exec -T db \
    pg_restore -U '$new_user' -d '$new_db' --clean --if-exists --no-owner \
    --single-transaction \
    < /tmp/iqc-migrate.dump"
  remote "rm -f /tmp/iqc-migrate.dump"
  log "重建 api 让新数据生效"
  rc "up -d --force-recreate api >/dev/null"
  sleep 3
  remote "curl -fsS http://127.0.0.1:$(web_port)/api/health && echo __OK__" | grep -q __OK__ \
    && ok "数据迁移完成" \
    || die "迁移后 api 异常，执行 ./scripts/deploy.sh logs api 查看"
}

# 导入示例文档：调 scripts/seed_samples.sh 经后台 API 上传 samples/，幂等（已存在会跳过）
# --local 时对 localhost:8088 跑（本地测试），否则 SSH 到服务器对本机 8088 跑
deploy_seed() {
  local admin_user admin_pass
  admin_user="$(env_get ADMIN_USERNAME)"; admin_user="${admin_user:-admin}"
  admin_pass="$(env_get ADMIN_PASSWORD)"
  [ -n "$admin_pass" ] || die "$ENV_FILE 里 ADMIN_PASSWORD 为空，无法导入示例文档"
  local port; port="$(web_port)"

  if [ "$LOCAL" = "1" ]; then
    log "本地导入示例文档 → http://127.0.0.1:${port}"
    ADMIN_USERNAME="$admin_user" ADMIN_PASSWORD="$admin_pass" \
      bash "$ROOT/scripts/seed_samples.sh" "http://127.0.0.1:${port}"
    ok "本地示例文档已导入（重复执行会自动跳过）"
    return 0
  fi

  need_server
  log "上传示例文件与导入脚本到 $SERVER:$REMOTE_DIR"
  # examples: samples/ 下的 docx/xlsx/pdf；打包上传，避免逐个 scp
  local tmp; tmp="$(mktemp -t iqc-samples).tar.gz"
  COPYFILE_DISABLE=1 tar czf "$tmp" --format=ustar -C samples .
  put "$tmp" .upload-samples.tar.gz
  put scripts/seed_samples.sh seed_samples.sh
  remote "mkdir -p samples && tar xzf .upload-samples.tar.gz -C samples \
    && rm -f .upload-samples.tar.gz"
  rm -f "$tmp"
  log "导入示例文档（已存在自动跳过）"
  # 在服务器上执行；密码用单引号包裹前先转义，避免特殊字符破坏命令
  local pass_esc; pass_esc="$(printf '%s' "$admin_pass" | sed "s/'/'\\\\''/g")"
  remote "ADMIN_USERNAME='${admin_user}' ADMIN_PASSWORD='${pass_esc}' \
    bash seed_samples.sh 'http://127.0.0.1:${port}'"
  ok "服务器示例文档已导入"
}

deploy_sql() {
  need_server
  local file="${ARG:-}"
  [ -n "$file" ] || die "用法：./scripts/deploy.sh sql database/xxx.sql"
  [ -f "$file" ] || die "文件不存在：$file"
  local user db
  user="$(env_get POSTGRES_USER)"; user="${user:-iqc_user}"
  db="$(env_get POSTGRES_DB)";     db="${db:-iqc_insp}"
  log "执行 SQL：${file}（库 ${db} / 用户 ${user}）"
  put "$file" .upload.sql
  remote "docker compose -f '$COMPOSE_FILE' exec -T db psql -U '$user' -d '$db' -v ON_ERROR_STOP=1 < .upload.sql && rm -f .upload.sql"
  ok "SQL 执行完成"
}

deploy_status() {
  need_server
  local user db
  user="$(env_get POSTGRES_USER)"; user="${user:-iqc_user}"
  db="$(env_get POSTGRES_DB)";     db="${db:-iqc_insp}"
  log "容器状态"
  rc "ps"
  echo
  log "健康检查（库 ${db} / 用户 ${user}，均为本地 $ENV_FILE 里的值）"
  local port; port="$(web_port)"
  remote "printf 'web  : '; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:${port}/
printf 'api  : '; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:${port}/api/health
printf 'db   : '; docker compose -f '$COMPOSE_FILE' exec -T db pg_isready -U '$user' -d '$db' >/dev/null 2>&1 && echo ok || echo fail"
}

deploy_logs() {
  need_server
  local svc="${ARG:-api}"
  rc "logs -f --tail=100 $svc"
}

deploy_ssh() {
  need_server
  ssh "${SSH_OPTS[@]}" "$SERVER" -t "cd '$REMOTE_DIR' && exec \$SHELL -l"
}

# ---------------- 入口 ----------------
case "$CMD" in
  frontend|fe)  deploy_frontend ;;
  backend|be)   deploy_backend ;;
  all|both)     deploy_frontend; deploy_backend; deploy_status ;;
  init)         deploy_init ;;
  config|env)   deploy_config ;;
  password|passwd) deploy_reset_password "${1:-}" ;;
  migrate)      deploy_migrate ${1:-pg} ${2:-iqc_insp} ${3:-iqc_user} ;;
  seed)         deploy_seed ;;
  sql)          deploy_sql ;;
  status|ps)    deploy_status ;;
  logs)         deploy_logs ;;
  ssh)          deploy_ssh ;;
  -h|--help|help)
    sed -n '2,32p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    die "未知命令：${CMD}（可用：frontend / backend / all / init / config / password / migrate / seed / sql / status / logs / ssh）"
    ;;
esac
