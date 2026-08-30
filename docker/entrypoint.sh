#!/bin/sh
set -e

CLI_DIR="/app/cli-tools"
NODE_PATH_VALUE="${CLI_DIR}/node_modules"

echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-localhost}:${POSTGRES_PORT:-5432}..."
while ! nc -z "${POSTGRES_HOST:-localhost}" "${POSTGRES_PORT:-5432}"; do
  sleep 1
done
echo "PostgreSQL is ready"

echo "Applying schema..."
NODE_PATH="$NODE_PATH_VALUE" node "${CLI_DIR}/node_modules/prisma/build/index.js" db push --accept-data-loss

echo "Generating Prisma client..."
NODE_PATH="$NODE_PATH_VALUE" node "${CLI_DIR}/node_modules/prisma/build/index.js" generate

echo "Seeding database..."
NODE_PATH="$NODE_PATH_VALUE" node "${CLI_DIR}/node_modules/tsx/dist/cli.mjs" prisma/seed.ts

echo "Starting Next.js application..."
cd /app/apps/web
exec node server.js