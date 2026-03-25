import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { compare, hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin321";

async function ensureAdminAccount() {
  const passwordHash = await hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Admin",
      passwordHash,
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
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

  return admin;
}

export const authOptions: NextAuthOptions = {
  ...(hasDatabaseUrl ? { adapter: PrismaAdapter(prisma) } : {}),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        let user: { id: string; name: string | null; email: string; image: string | null; passwordHash: string | null } | null = null;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              passwordHash: true,
            },
          });

          if (!user && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            user = await ensureAdminAccount();
          }
        } catch {
          user = null;
        }

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "");
      }
      return session;
    },
  },
};
