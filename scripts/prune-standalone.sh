#!/usr/bin/env bash
# 对 Next.js standalone 产物进行瘦身，减少最终 Electron 安装包体积。
# 在 `next build` 之后、`electron-builder` 打包之前执行。

set -e

cd .next/standalone/node_modules

# 1. 删除运行时不需要的依赖（仅构建/CLI 用）
rm -rf typescript @swc/core prisma

# 2. 删除非当前平台的原生二进制
rm -rf @next/swc-linux-* @next/swc-win32-* @next/swc-darwin-x64
rm -rf @img/sharp-libvips-linux* @img/sharp-libvips-linuxmusl*
rm -rf @img/sharp-libvips-win32* @img/sharp-libvips-darwin-x64
rm -rf @img/sharp-linux-* @img/sharp-linuxmusl-* @img/sharp-win32-*
rm -rf @img/sharp-darwin-x64 @img/sharp-wasm32
rm -rf @parcel/watcher-linux-* @parcel/watcher-win32-*
rm -rf @parcel/watcher-darwin-x64 @parcel/watcher-android-* @parcel/watcher-freebsd-*

# 3. 清理 Prisma 多余平台引擎
find @prisma -type f \( \
  -name '*query_engine-debian*' -o \
  -name '*query_engine-rhel*' -o \
  -name '*query_engine-linux*' -o \
  -name '*query_engine-windows*' -o \
  -name '*query_engine-darwin-x64*' -o \
  -name '*libquery_engine-debian*' -o \
  -name '*libquery_engine-rhel*' -o \
  -name '*libquery_engine-linux*' -o \
  -name '*query-engine-windows*' -o \
  -name '*query-engine-darwin-x64*' \
\) -delete 2>/dev/null || true

# 4. 通用瘦身：类型声明、source map、文档、license、changelog
find . -type f \( \
  -name '*.d.ts' -o \
  -name '*.map' -o \
  -name '*.md' -o \
  -name 'LICENSE*' -o \
  -name 'CHANGELOG*' \
\) -delete 2>/dev/null || true

# 5. 删除测试 / CI / 文档目录
find . -type d \( \
  -name 'test' -o \
  -name 'tests' -o \
  -name '__tests__' -o \
  -name '.github' -o \
  -name 'docs' \
\) -exec rm -rf {} + 2>/dev/null || true

echo "✓ standalone 瘦身完成"
