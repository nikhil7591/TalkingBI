import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL?.trim();

const prismaClient = (() => {
  if (!databaseUrl) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is not configured.");
        },
      }
    ) as PrismaClient;
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return global.prisma || new PrismaClient({ adapter });
})();

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
