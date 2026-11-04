SHELL := /bin/bash
COMPOSE := docker compose
LOCAL_COMPOSE := docker compose --profile local-db

.PHONY: help env local up down restart ps logs build backend-test smoke package deploy prod prod-logs backup

help:
	@echo "quality-Iqc 常用命令"
	@echo "  make local    复制本地 .env（如不存在）并构建启动完整本地栈"
	@echo "  make up       启动已在 .env 中配置的栈（生产/外部数据库）"
	@echo "  make down     停止当前栈"
	@echo "  make logs     查看全部服务日志"
	@echo "  make ps       查看容器状态"
	@echo "  make smoke    运行 API 冒烟测试（默认 http://localhost:8088）"
	@echo "  make images   本地构建 linux/amd64 镜像包（推荐生产）"
	@echo "  make package  生成不含密钥的源码部署包"
	@echo "  make backup   备份上传文件与本地数据库"

env:
	@test -f .env || (cp .env.local.example .env && echo "已创建 .env，请修改 SECRET_KEY 与 ADMIN_PASSWORD")

local: env
	$(LOCAL_COMPOSE) up -d --build
	@echo "Web: http://localhost:$$(grep -E '^WEB_PORT=' .env | cut -d= -f2 || echo 8088)"

up:
	@test -f .env || (echo "缺少 .env，请参考 .env.production.example" && exit 1)
	$(COMPOSE) up -d --build

down:
	$(LOCAL_COMPOSE) down

restart:
	$(COMPOSE) restart

ps:
	$(LOCAL_COMPOSE) ps

logs:
	$(LOCAL_COMPOSE) logs -f --tail=100

build:
	$(LOCAL_COMPOSE) build

backend-test:
	cd backend && ../.venv/bin/python -m pytest -q

smoke:
	./scripts/smoke_test.sh

images:
	./scripts/build-images.sh 1.1.0

package:
	./scripts/package.sh

deploy:
	./scripts/deploy.sh

prod:
	@test -f .env || (echo "缺少 .env，请参考 .env.production.example" && exit 1)
	$(COMPOSE) up -d --build

prod-logs:
	$(COMPOSE) logs -f --tail=100

backup:
	./scripts/backup.sh
