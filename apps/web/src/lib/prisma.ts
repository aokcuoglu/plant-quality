import { PrismaClient } from "@plantx/db/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Bump when Prisma schema fields change so the Next.js global singleton
 * does not keep an outdated client after `prisma generate` + HMR.
 */
const PRISMA_CLIENT_REVISION = 2;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientRevision?: number;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

if (globalForPrisma.prismaClientRevision !== PRISMA_CLIENT_REVISION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaClientRevision = PRISMA_CLIENT_REVISION;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
