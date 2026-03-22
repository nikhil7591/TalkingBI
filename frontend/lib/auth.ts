import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { compare } from "bcryptjs";

import { findDemoUserByEmail } from "@/lib/demo-user-store";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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

        let user: { id: string; name: string | null; email: string; image: string | null; passwordHash: string | null } | null = null;
        try {
          user = await prisma.user.findUnique({ where: { email: credentials.email } });
        } catch {
          user = null;
        }

        if (!user) {
          const demoUser = findDemoUserByEmail(credentials.email);
          if (demoUser) {
            const demoValid = await compare(credentials.password, demoUser.passwordHash);
            if (!demoValid) {
              return null;
            }

            return {
              id: demoUser.id,
              name: demoUser.name,
              email: demoUser.email,
              image: null,
            };
          }
        }

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(credentials.password, user.passwordHash);
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
