# ---------- Build stage ----------
# Use the official Bun image for building (smaller + faster than node)
FROM oven/bun:1.1 AS builder

WORKDIR /app

# Install OS deps for Prisma + sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first (better layer caching)
COPY package.json bun.lock* ./
COPY prisma ./prisma

# Install deps
RUN bun install --frozen-lockfile

# Generate Prisma client (needed at build time for type checking)
RUN bun run db:generate

# Copy source
COPY . .

# Build Next.js (produces .next/standalone + .next/static)
RUN bun run build

# ---------- Runtime stage ----------
FROM oven/bun:1.1-debian AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install only runtime deps (openssl for Prisma)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Create data dir for SQLite (owned by non-root user)
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app

# Copy standalone server (Next.js output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + migrations so we can run db:push at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Healthcheck (optional but recommended)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Startup script: push schema + start server
CMD ["sh", "-c", "bunx prisma db push --skip-generate && node server.js"]
