import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run seed.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin321", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {
      name: "Admin",
      passwordHash: hashedPassword,
    },
    create: {
      email: "admin@gmail.com",
      name: "Admin",
      passwordHash: hashedPassword,
    },
    select: {
      id: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: `admin-enterprise-${admin.id}` },
    update: {
      plan: "ENTERPRISE",
      status: "active",
      periodEnd: new Date("2099-12-31T23:59:59.000Z"),
    },
    create: {
      id: `admin-enterprise-${admin.id}`,
      userId: admin.id,
      plan: "ENTERPRISE",
      status: "active",
      periodStart: new Date(),
      periodEnd: new Date("2099-12-31T23:59:59.000Z"),
    },
  });

  console.log("Admin user seeded: admin@gmail.com / admin321");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
