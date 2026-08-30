# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json
COPY packages/db/package.json ./packages/db/package.json
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inject env vars for Next.js static generation at build time
# This file is not copied to the runtime runner stage.
COPY .env.docker /app/apps/web/.env

# The generated Prisma client is committed in packages/db and used as-is by
# the build (kept in sync with the schema). Entrypoint regenerates at runtime.
WORKDIR /app/apps/web
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (built in apps/web). In a monorepo the standalone
# nests the app under apps/web/. Do NOT move it up — the relative symlinks in
# .next/node_modules (Turbopack externals) break if relocated. The entrypoint
# runs server.js from its nested location.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public /app/apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json /app/apps/web/package.json

# CLI tooling for entrypoint (db push / generate / seed). Keep /app/node_modules
# as the traced standalone (a full override breaks Next's Turbopack
# instrumentation externals) and isolate the full prisma CLI dependency closure
# under /app/cli-tools so the entrypoint can run it without breaking Next.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./cli-tools/node_modules

# Copy entrypoint
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]