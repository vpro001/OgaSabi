import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/env";

const globalForPrisma = globalThis as unknown as { __ogasabiPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const env = getEnv();
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  globalForPrisma.__ogasabiPrisma ??= createClient();
  return globalForPrisma.__ogasabiPrisma;
}

/**
 * Lazily-created Prisma client. Creating it on first use (not at import time) keeps `next build`
 * from needing a database or secrets.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export async function disconnectDb(): Promise<void> {
  if (globalForPrisma.__ogasabiPrisma) {
    await globalForPrisma.__ogasabiPrisma.$disconnect();
    globalForPrisma.__ogasabiPrisma = undefined;
  }
}
