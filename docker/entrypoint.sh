#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
while ! nc -z "${POSTGRES_HOST:-db}" "${POSTGRES_PORT:-5432}"; do
  sleep 1
done
echo "PostgreSQL is ready"

echo "Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss

echo "Generating Prisma client..."
npx prisma generate

echo "Seeding database..."
npx prisma db seed

echo "Starting Next.js application..."
exec node server.js
