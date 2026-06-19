#!/usr/bin/env bash
# 复制 .env 到 standalone 产物，但剔除 DATABASE_URL
# （Electron 运行时使用本地 SQLite，路径由主进程动态注入）

grep -v '^DATABASE_URL=' .env > .next/standalone/.env || true
