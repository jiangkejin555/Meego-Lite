# ==============================================================================
# Meego Lite 一键部署 Makefile
# ------------------------------------------------------------------------------
# 使用方法（在阿里云服务器上）:
#   make help              # 查看所有命令
#   make first-deploy      # 首次部署（init + install + build + nginx-temp + start）
#   make update            # 日常更新（git pull + install + build + restart）
#   make ssl DOMAIN=xx.com # 备案通过后开启 HTTPS
#
# 使用方法（本地）:
#   make remote-deploy     # 一键远程部署到阿里云
# ==============================================================================

# ===== 配置变量（按需修改 / 也可以用环境变量覆盖）=============================
APP_NAME      ?= meego-lite
APP_DIR       ?= $(shell pwd)
APP_PORT      ?= 3000
TEMP_PORT     ?= 8080
NPM_REGISTRY  ?= https://registry.npmmirror.com
DB_PATH       ?= $(APP_DIR)/prisma/prod.db
BACKUP_DIR    ?= /opt/backup

# 远程部署相关（make remote-deploy 使用）
REMOTE_USER   ?= admin
REMOTE_HOST   ?= 8.137.204.102
REMOTE_DIR    ?= /home/admin/kejin/Meego-Lite

# 域名（make ssl 时使用）
DOMAIN        ?=

# ===== 颜色输出 ===============================================================
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
RESET  := \033[0m

# 强制使用 bash（默认 /bin/sh 在 Ubuntu 上是 dash，不支持很多语法）
SHELL := /bin/bash

.DEFAULT_GOAL := help
.PHONY: help init system-deps install build start stop restart status logs \
        db-init db-push db-backup nginx-temp nginx-prod ssl deploy first-deploy update \
        clean swap registry-config remote-deploy install-full monit

# ==============================================================================
# 帮助
# ==============================================================================
help: ## 显示所有可用命令
	@printf "\n$(CYAN)Meego Lite 部署 Makefile$(RESET)\n\n"
	@printf "$(GREEN)常用一键命令：$(RESET)\n"
	@printf "  $(YELLOW)make first-deploy$(RESET)  首次部署（一条命令搞定）\n"
	@printf "  $(YELLOW)make update$(RESET)        日常更新代码后重启\n"
	@printf "  $(YELLOW)make ssl DOMAIN=xx.com$(RESET)  备案通过后开 HTTPS\n\n"
	@printf "$(GREEN)所有命令：$(RESET)\n"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(GREEN)配置变量（可覆盖）：$(RESET)\n"
	@printf "  APP_NAME=$(APP_NAME)  APP_PORT=$(APP_PORT)  TEMP_PORT=$(TEMP_PORT)\n"
	@printf "  REMOTE_USER=$(REMOTE_USER)  REMOTE_HOST=$(REMOTE_HOST)  REMOTE_DIR=$(REMOTE_DIR)\n\n"

# ==============================================================================
# 一键部署组合命令
# ==============================================================================
first-deploy: system-deps swap registry-config install build db-init nginx-temp start ## 首次部署：环境 + 依赖 + 构建 + Nginx + 启动
	@printf "\n$(GREEN)✓ 首次部署完成！$(RESET)\n"
	@printf "  访问地址：$(YELLOW)http://$$(curl -s ifconfig.me):$(TEMP_PORT)$(RESET)\n"
	@printf "  查看日志：$(YELLOW)make logs$(RESET)\n"
	@printf "  备案通过后开 HTTPS：$(YELLOW)make ssl DOMAIN=你的域名.com$(RESET)\n\n"

update: db-backup ## 日常更新：备份 + 拉代码 + 装依赖 + 同步表结构 + 构建 + 重启
	@printf "$(CYAN)>> 拉取最新代码...$(RESET)\n"
	@git pull
	@$(MAKE) db-push
	@$(MAKE) build
	@$(MAKE) restart
	@printf "$(GREEN)✓ 更新完成$(RESET)\n"

deploy: db-push build restart ## 简版部署：同步表结构+构建+重启（不拉代码、不备份）
	@printf "$(GREEN)✓ 部署完成$(RESET)\n"

# ==============================================================================
# 远程一键部署（在本地 Mac 执行）
# ==============================================================================
remote-deploy: ## [本地] SSH 远程触发服务器执行 update
	@printf "$(CYAN)>> 远程部署到 $(REMOTE_USER)@$(REMOTE_HOST)...$(RESET)\n"
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_DIR) && make update"
	@printf "$(GREEN)✓ 远程部署完成$(RESET)\n"

# ==============================================================================
# 系统环境
# ==============================================================================
system-deps: ## 安装系统依赖（unzip / nginx / certbot / pm2 / bun）
	@printf "$(CYAN)>> 关闭 needrestart 交互弹窗（自动重启服务）...$(RESET)\n"
	@if [ -f /etc/needrestart/needrestart.conf ]; then \
		sudo sed -i 's|^#\?\$$nrconf{restart} = .*|\$$nrconf{restart} = "a";|' /etc/needrestart/needrestart.conf || true; \
		sudo sed -i 's|^#\?\$$nrconf{kernelhints} = .*|\$$nrconf{kernelhints} = 0;|' /etc/needrestart/needrestart.conf || true; \
	fi
	@printf "$(CYAN)>> 安装系统依赖...$(RESET)\n"
	@sudo DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt update
	@sudo DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt install -y \
	                     unzip curl wget git vim build-essential ca-certificates \
	                     nginx certbot python3-certbot-nginx ufw sqlite3
	@if ! command -v node >/dev/null; then \
		printf "$(CYAN)>> 安装 Node.js 20...$(RESET)\n"; \
		curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -; \
		sudo DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt install -y nodejs; \
	fi
	@if ! command -v bun >/dev/null; then \
		printf "$(CYAN)>> 安装 Bun...$(RESET)\n"; \
		curl -fsSL https://bun.sh/install | bash; \
	fi
	@if ! command -v pm2 >/dev/null; then \
		printf "$(CYAN)>> 安装 PM2...$(RESET)\n"; \
		sudo npm install -g pm2 --registry=$(NPM_REGISTRY); \
	fi
	@printf "$(GREEN)✓ 系统依赖安装完成$(RESET)\n"

swap: ## 创建 2GB swap（防止 2G 内存 OOM）
	@if [ ! -f /swapfile ]; then \
		printf "$(CYAN)>> 创建 2GB swap...$(RESET)\n"; \
		sudo fallocate -l 2G /swapfile; \
		sudo chmod 600 /swapfile; \
		sudo mkswap /swapfile; \
		sudo swapon /swapfile; \
		echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab; \
		printf "$(GREEN)✓ Swap 创建完成$(RESET)\n"; \
	else \
		printf "$(YELLOW)Swap 已存在，跳过$(RESET)\n"; \
	fi

registry-config: ## 配置 Bun/npm 国内镜像源
	@printf "$(CYAN)>> 配置国内镜像源...$(RESET)\n"
	@mkdir -p $(HOME)/.bun
	@printf '[install]\nregistry = "$(NPM_REGISTRY)"\nfrozenLockfile = false\n' > $(HOME)/.bun/bunfig.toml
	@printf 'registry=$(NPM_REGISTRY)\nelectron_mirror=https://npmmirror.com/mirrors/electron/\nelectron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/\n' > $(HOME)/.npmrc
	@printf "$(GREEN)✓ 镜像配置完成$(RESET)\n"

# ==============================================================================
# 项目构建
# ==============================================================================
install: ## 安装项目依赖（生产模式，按 bun.lock 严格装包）
	@printf "$(CYAN)>> 清理其他包管理器的 lockfile 残留...$(RESET)\n"
	@rm -f package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true
	@printf "$(CYAN)>> 安装项目依赖（生产模式，按 bun.lock 严格装包）...$(RESET)\n"
	@if [ -f bun.lock ] || [ -f bun.lockb ]; then \
		( bun install --production --frozen-lockfile --registry=$(NPM_REGISTRY) || \
		  ( printf "$(YELLOW)Bun frozen 失败，重试不带 frozen...$(RESET)\n" && \
		    bun install --production --no-frozen-lockfile --registry=$(NPM_REGISTRY) ) || \
		  ( printf "$(YELLOW)Bun 仍失败，回退到 npm（含 legacy-peer-deps）...$(RESET)\n" && \
		    npm install --omit=dev --no-package-lock --legacy-peer-deps --registry=$(NPM_REGISTRY) ) ); \
	else \
		printf "$(YELLOW)未找到 bun.lock，从头生成...$(RESET)\n"; \
		bun install --production --no-frozen-lockfile --registry=$(NPM_REGISTRY) || \
		npm install --omit=dev --no-package-lock --legacy-peer-deps --registry=$(NPM_REGISTRY); \
	fi
	@printf "$(GREEN)✓ 依赖安装完成$(RESET)\n"

install-full: ## 安装完整依赖（含 dev，按 bun.lock 严格装包）
	@printf "$(CYAN)>> 清理其他包管理器的 lockfile 残留...$(RESET)\n"
	@rm -f package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true
	@printf "$(CYAN)>> 安装完整依赖（按 bun.lock 严格装包）...$(RESET)\n"
	@if [ -f bun.lock ] || [ -f bun.lockb ]; then \
		( bun install --frozen-lockfile --registry=$(NPM_REGISTRY) || \
		  ( printf "$(YELLOW)Bun frozen 失败，重试不带 frozen...$(RESET)\n" && \
		    bun install --no-frozen-lockfile --registry=$(NPM_REGISTRY) ) || \
		  ( printf "$(YELLOW)Bun 仍失败，回退到 npm（含 legacy-peer-deps）...$(RESET)\n" && \
		    npm install --no-package-lock --legacy-peer-deps --registry=$(NPM_REGISTRY) ) ); \
	else \
		printf "$(YELLOW)未找到 bun.lock，从头生成...$(RESET)\n"; \
		bun install --no-frozen-lockfile --registry=$(NPM_REGISTRY) || \
		npm install --no-package-lock --legacy-peer-deps --registry=$(NPM_REGISTRY); \
	fi
	@printf "$(GREEN)✓ 依赖安装完成$(RESET)\n"

build: install-full ## 构建项目
	@printf "$(CYAN)>> 生成 Prisma Client...$(RESET)\n"
	@bunx prisma generate
	@printf "$(CYAN)>> 构建 Next.js...$(RESET)\n"
	@bun run build
	@printf "$(CYAN)>> 复制 static 和 public 到 standalone...$(RESET)\n"
	@if [ -d .next/standalone ]; then \
		cp -r .next/static .next/standalone/.next/ 2>/dev/null || true; \
		cp -r public .next/standalone/ 2>/dev/null || true; \
	fi
	@printf "$(GREEN)✓ 构建完成$(RESET)\n"

clean: ## 清理 node_modules 和构建产物
	@printf "$(CYAN)>> 清理...$(RESET)\n"
	@rm -rf node_modules .next bun.lock bun.lockb
	@printf "$(GREEN)✓ 清理完成$(RESET)\n"

# ==============================================================================
# 数据库
# ==============================================================================
db-init: ## 初始化数据库 + WAL 模式（首次部署用）
	@printf "$(CYAN)>> 初始化数据库...$(RESET)\n"
	@DATABASE_URL="file:$(DB_PATH)" bunx prisma db push
	@sqlite3 $(DB_PATH) "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;" || true
	@printf "$(GREEN)✓ 数据库初始化完成$(RESET)\n"

db-push: ## 同步 schema.prisma 到数据库（保留已有数据，安全）
	@printf "$(CYAN)>> 同步数据库表结构（prisma db push）...$(RESET)\n"
	@DATABASE_URL="file:$(DB_PATH)" bunx prisma generate
	@DATABASE_URL="file:$(DB_PATH)" bunx prisma db push --skip-generate --accept-data-loss=false
	@printf "$(GREEN)✓ 数据库表结构同步完成$(RESET)\n"

db-backup: ## 备份数据库到 $(BACKUP_DIR)
	@sudo mkdir -p $(BACKUP_DIR)
	@if [ -f $(DB_PATH) ]; then \
		BACKUP_FILE="$(BACKUP_DIR)/prod-$$(date +%Y%m%d-%H%M%S).db"; \
		sudo cp $(DB_PATH) $$BACKUP_FILE; \
		printf "$(GREEN)✓ 备份完成：$$BACKUP_FILE$(RESET)\n"; \
	else \
		printf "$(YELLOW)数据库文件不存在，跳过备份$(RESET)\n"; \
	fi

# ==============================================================================
# 进程管理（PM2）
# ==============================================================================
start: ## 启动应用（PM2）
	@printf "$(CYAN)>> 启动应用...$(RESET)\n"
	@pm2 describe $(APP_NAME) >/dev/null 2>&1 && pm2 restart $(APP_NAME) || \
		pm2 start "bun .next/standalone/server.js" --name $(APP_NAME) \
			--env NODE_ENV=production \
			--env HOSTNAME=127.0.0.1 \
			--env PORT=$(APP_PORT)
	@pm2 save
	@printf "$(GREEN)✓ 应用已启动$(RESET)\n"

stop: ## 停止应用
	@pm2 stop $(APP_NAME) || true
	@printf "$(GREEN)✓ 应用已停止$(RESET)\n"

restart: ## 重启应用
	@pm2 restart $(APP_NAME)
	@printf "$(GREEN)✓ 应用已重启$(RESET)\n"

status: ## 查看应用状态
	@pm2 status

logs: ## 查看应用日志（实时）
	@pm2 logs $(APP_NAME) --lines 100

monit: ## PM2 实时监控（CPU / 内存）
	@pm2 monit

# ==============================================================================
# Nginx
# ==============================================================================
# ==============================================================================
# Nginx 配置模板（使用 define 块定义多行内容）
# ==============================================================================
define NGINX_TEMP_CONF
map $$http_upgrade $$connection_upgrade {
    default upgrade;
    ''      close;
}
server {
    listen $(TEMP_PORT);
    server_name _;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$(APP_PORT);
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:$(APP_PORT);
        proxy_http_version 1.1;
        proxy_set_header Upgrade $$http_upgrade;
        proxy_set_header Connection $$connection_upgrade;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $$scheme;
    }
}
endef
export NGINX_TEMP_CONF

define NGINX_PROD_CONF
map $$http_upgrade $$connection_upgrade {
    default upgrade;
    ''      close;
}
server {
    listen 80;
    server_name $(DOMAIN) www.$(DOMAIN);
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;
    client_max_body_size 20M;
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$(APP_PORT);
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    location ~* \.(jpg|jpeg|png|gif|ico|webp|svg|woff|woff2)$$ {
        proxy_pass http://127.0.0.1:$(APP_PORT);
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    location / {
        proxy_pass http://127.0.0.1:$(APP_PORT);
        proxy_http_version 1.1;
        proxy_set_header Upgrade $$http_upgrade;
        proxy_set_header Connection $$connection_upgrade;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $$scheme;
    }
}
endef
export NGINX_PROD_CONF

nginx-temp: ## 配置临时 Nginx（监听 $(TEMP_PORT) 端口，备案前用）
	@printf "$(CYAN)>> 配置临时 Nginx (端口 $(TEMP_PORT))...$(RESET)\n"
	@echo "$$NGINX_TEMP_CONF" | sudo tee /etc/nginx/sites-available/$(APP_NAME)-temp > /dev/null
	@sudo ln -sf /etc/nginx/sites-available/$(APP_NAME)-temp /etc/nginx/sites-enabled/
	@sudo rm -f /etc/nginx/sites-enabled/default
	@sudo nginx -t
	@sudo systemctl reload nginx
	@sudo ufw allow $(TEMP_PORT) || true
	@printf "$(GREEN)✓ 临时 Nginx 配置完成$(RESET)\n"
	@printf "  $(YELLOW)记得在阿里云控制台开放 $(TEMP_PORT) 端口！$(RESET)\n"

nginx-prod: ## 配置正式 Nginx（监听 80，需指定 DOMAIN）
	@if [ -z "$(DOMAIN)" ]; then \
		printf "$(RED)错误：请指定域名，例如 make nginx-prod DOMAIN=xxx.com$(RESET)\n"; \
		exit 1; \
	fi
	@printf "$(CYAN)>> 配置正式 Nginx (域名 $(DOMAIN))...$(RESET)\n"
	@echo "$$NGINX_PROD_CONF" | sudo tee /etc/nginx/sites-available/$(APP_NAME) > /dev/null
	@sudo rm -f /etc/nginx/sites-enabled/$(APP_NAME)-temp
	@sudo ln -sf /etc/nginx/sites-available/$(APP_NAME) /etc/nginx/sites-enabled/
	@sudo nginx -t
	@sudo systemctl reload nginx
	@printf "$(GREEN)✓ 正式 Nginx 配置完成$(RESET)\n"

# ==============================================================================
# HTTPS
# ==============================================================================
ssl: ## 申请并配置 HTTPS 证书（需指定 DOMAIN）
	@if [ -z "$(DOMAIN)" ]; then \
		printf "$(RED)错误：请指定域名，例如 make ssl DOMAIN=xxx.com$(RESET)\n"; \
		exit 1; \
	fi
	@printf "$(CYAN)>> 申请 HTTPS 证书 ($(DOMAIN))...$(RESET)\n"
	@$(MAKE) nginx-prod DOMAIN=$(DOMAIN)
	@sudo certbot --nginx -d $(DOMAIN) -d www.$(DOMAIN)
	@sudo certbot renew --dry-run
	@printf "$(GREEN)✓ HTTPS 配置完成，访问 https://$(DOMAIN)$(RESET)\n"
