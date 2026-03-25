import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT_BY_PLAN: Record<string, number> = {
  free: 30,
  pro: 150,
  enterprise: 500,
  admin: 9_999_999,
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; userEmail?: string };
    const userId = body.userId?.trim();
    const userEmail = body.userEmail?.trim().toLowerCase() || "";
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptions: {
          where: { status: "active" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { plan: true },
        },
      },
    });

    if (!user && userEmail) {
      user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          id: true,
          email: true,
          subscriptions: {
            where: { status: "active" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { plan: true },
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = (user.email || "").toLowerCase() === "admin@gmail.com";
    const plan = (user.subscriptions[0]?.plan || "FREE").toLowerCase();
    const tier = isAdmin ? "admin" : plan;
    const dailyLimit = DAILY_LIMIT_BY_PLAN[tier] ?? DAILY_LIMIT_BY_PLAN.free;

    const today = startOfUtcDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const usedToday = await prisma.usageEvent.aggregate({
      where: {
        userId: user.id,
        metric: "KPI_QUERY",
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { value: true },
    });

    const used = Number(usedToday._sum.value || 0);
    const tokensRemaining = Math.max(0, dailyLimit - used);

    return NextResponse.json({
      userId: user.id,
      plan: isAdmin ? "admin" : plan,
      isPaid: isAdmin || plan !== "free",
      dailyLimit,
      tokensUsed: used,
      tokensRemaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch credit status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
