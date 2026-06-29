#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Meego Lite Agent 启动验证脚本
# 新会话开始时执行，验证基础环境并输出项目状态
# ==============================================================================

CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

APP_NAME="meego-lite"
APP_PORT="3000"

echo -e "${CYAN}========================================${RESET}"
echo -e "${CYAN}  Meego Lite Agent 启动验证${RESET}"
echo -e "${CYAN}========================================${RESET}"
echo ""

# 1. 检查运行时
if command -v bun >/dev/null 2>&1; then
    RUNTIME="bun"
    RUNTIME_VERSION=$(bun --version)
    echo -e "${GREEN}✓${RESET} 运行时: Bun ${RUNTIME_VERSION}"
elif command -v node >/dev/null 2>&1; then
    RUNTIME="node"
    RUNTIME_VERSION=$(node --version)
    echo -e "${YELLOW}⚠${RESET} 运行时: Node.js ${RUNTIME_VERSION}（建议安装 Bun）"
else
    echo -e "${RED}✗${RESET} 未找到 Bun 或 Node.js，请先安装"
    exit 1
fi

# 2. 检查依赖
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${RESET} node_modules 已存在"
else
    echo -e "${YELLOW}⚠${RESET} node_modules 不存在，正在安装依赖..."
    if [ "$RUNTIME" = "bun" ]; then
        bun install
    else
        npm install
    fi
    echo -e "${GREEN}✓${RESET} 依赖安装完成"
fi

# 3. 检查 Prisma Client
if [ -d "node_modules/.prisma/client" ]; then
    echo -e "${GREEN}✓${RESET} Prisma Client 已生成"
else
    echo -e "${YELLOW}⚠${RESET} Prisma Client 未生成，正在生成..."
    if [ "$RUNTIME" = "bun" ]; then
        bunx prisma generate
    else
        npx prisma generate
    fi
    echo -e "${GREEN}✓${RESET} Prisma Client 生成完成"
fi

# 4. 检查数据库
if [ -f "prisma/dev.db" ]; then
    echo -e "${GREEN}✓${RESET} 开发数据库已存在 (prisma/dev.db)"
else
    echo -e "${YELLOW}⚠${RESET} 开发数据库不存在，正在初始化..."
    if [ "$RUNTIME" = "bun" ]; then
        bun run db:push
    else
        npm run db:push
    fi
    echo -e "${GREEN}✓${RESET} 数据库初始化完成"
fi

# 5. 检查 .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${RESET} .env 文件已存在"
else
    echo -e "${YELLOW}⚠${RESET} .env 文件不存在，从 .env.example 复制..."
    cp .env.example .env
    echo -e "${YELLOW}⚠${RESET} 请编辑 .env 文件配置必要的环境变量（如 SMTP、AUTH_SECRET）"
fi

# 6. 输出项目状态摘要
echo ""
echo -e "${CYAN}----------------------------------------${RESET}"
echo -e "${CYAN}  项目状态摘要${RESET}"
echo -e "${CYAN}----------------------------------------${RESET}"

# Git 状态
if command -v git >/dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "无提交")
    echo -e "分支: ${GREEN}${BRANCH}${RESET}"
    echo -e "最近提交: ${GREEN}${LAST_COMMIT}${RESET}"
fi

# 功能状态
if [ -f "harness/feature_list.json" ]; then
    DONE_COUNT=$(grep -c '"status": "done"' harness/feature_list.json 2>/dev/null || echo "0")
    TOTAL_COUNT=$(grep -c '"id": "feat-' harness/feature_list.json 2>/dev/null || echo "0")
    echo -e "功能完成: ${GREEN}${DONE_COUNT}/${TOTAL_COUNT}${RESET}"
fi

echo ""
echo -e "${CYAN}----------------------------------------${RESET}"
echo -e "${CYAN}  常用命令${RESET}"
echo -e "${CYAN}----------------------------------------${RESET}"
echo -e "  开发模式:     ${YELLOW}bun run dev${RESET}"
echo -e "  停止开发:     ${YELLOW}bun run dev:stop${RESET}"
echo -e "  生产构建:     ${YELLOW}bun run build${RESET}"
echo -e "  数据库推送:   ${YELLOW}bun run db:push${RESET}"
echo -e "  数据库迁移:   ${YELLOW}bun run db:migrate${RESET}"
echo -e "  Electron 预览: ${YELLOW}bun run electron:dev${RESET}"
echo -e "  查看进度:     ${YELLOW}cat harness/claude-progress.md${RESET}"
echo -e "  查看功能列表: ${YELLOW}cat harness/feature_list.json${RESET}"
echo ""
echo -e "${GREEN}✓ 启动验证完成，可以开始工作${RESET}"
