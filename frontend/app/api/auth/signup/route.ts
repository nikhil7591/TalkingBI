import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { addDemoUser, findDemoUserByEmail } from "@/lib/demo-user-store";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let name = "";
  let email = "";
  let password = "";

  try {
    const body = (await req.json()) as { name?: string; email?: string; password?: string };
    name = body.name?.trim() || "";
    email = body.email?.trim().toLowerCase() || "";
    password = body.password?.trim() || "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (name && email && password) {
      if (findDemoUserByEmail(email)) {
        return NextResponse.json({ error: "User already exists." }, { status: 409 });
      }

      const fallbackHash = await hash(password, 10);
      const demoUser = addDemoUser({
        id: `demo-${Date.now()}`,
        name,
        email,
        passwordHash: fallbackHash,
      });

      return NextResponse.json(
        {
          user: {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            mode: "demo-fallback",
          },
          warning: "Database was unreachable. Account was created in temporary demo memory.",
        },
        { status: 201 }
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      if (findDemoUserByEmail(email || "")) {
        return NextResponse.json({ error: "User already exists." }, { status: 409 });
      }

      const fallbackHash = await hash(password || "", 10);
      const demoUser = addDemoUser({
        id: `demo-${Date.now()}`,
        name: name || "Talking BI User",
        email: email || "",
        passwordHash: fallbackHash,
      });

      return NextResponse.json(
        {
          user: {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            mode: "demo-fallback",
          },
          warning: "Database was unreachable. Account was created in temporary demo memory.",
        },
        { status: 201 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return NextResponse.json(
          { error: "Database tables are missing. Run: npm run prisma:migrate" },
          { status: 500 }
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "User already exists." }, { status: 409 });
      }
    }

    const message = error instanceof Error ? error.message : "Could not create account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
