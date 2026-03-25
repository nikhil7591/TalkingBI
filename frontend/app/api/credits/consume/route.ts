import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EventType =
  | "KPI_QUERY"
  | "DASHBOARD_GENERATION"
  | "PREMIUM_CHART_SELECTION"
  | "BI_CHAT_QUERY"
  | "VOICE_EXPLANATION";

const DAILY_CREDITS: Record<string, number> = {
  free: 30,
  pro: 150,
  enterprise: 500,
  admin: 9_999_999,
};

const EVENT_COST: Record<EventType, number> = {
  KPI_QUERY: 5,
  DASHBOARD_GENERATION: 8,
  PREMIUM_CHART_SELECTION: 3,
  BI_CHAT_QUERY: 2,
  VOICE_EXPLANATION: 2,
};

const ALLOWED_EVENT_TYPES = new Set<EventType>([
  "KPI_QUERY",
  "DASHBOARD_GENERATION",
  "PREMIUM_CHART_SELECTION",
  "BI_CHAT_QUERY",
  "VOICE_EXPLANATION",
]);

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; userEmail?: string; eventType?: string };
    const userId = body.userId?.trim();
    const userEmail = body.userEmail?.trim().toLowerCase() || "";
    const eventTypeRaw = (body.eventType || "KPI_QUERY").trim().toUpperCase();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!ALLOWED_EVENT_TYPES.has(eventTypeRaw as EventType)) {
      return NextResponse.json({ error: `Unsupported eventType: ${eventTypeRaw}` }, { status: 400 });
    }

    const eventType = eventTypeRaw as EventType;
    const cost = EVENT_COST[eventType];
    const now = new Date();
    const today = startOfUtcDay(now);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

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
      return NextResponse.json(
        {
          error: "Account not found. Please logout and login again.",
          allowed: false,
          missingUser: true,
          tokensRemaining: 0,
          tokensUsed: 0,
          dailyLimit: 0,
        },
        { status: 404 }
      );
    }

    const isAdmin = (user.email || "").toLowerCase() === "admin@gmail.com";
    const plan = (user.subscriptions[0]?.plan || "FREE").toLowerCase();
    const tierKey = isAdmin ? "admin" : plan;
    const dailyLimit = DAILY_CREDITS[tierKey] ?? DAILY_CREDITS.free;

    const result = await prisma.$transaction(async (tx) => {
      const usedAgg = await tx.usageEvent.aggregate({
        where: {
          userId: user.id,
          metric: eventType,
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { value: true },
      });

      const used = Number(usedAgg._sum.value || 0);
      const remaining = Math.max(0, dailyLimit - used);

      if (remaining < cost) {
        return {
          allowed: false,
          tokensRemaining: remaining,
          tokensUsed: used,
          dailyLimit,
          message: "Insufficient credits. Upgrade your plan or wait for daily reset.",
        };
      }

      await tx.usageEvent.create({
        data: {
          userId: user.id,
          metric: eventType,
          value: cost,
        },
      });

      return {
        allowed: true,
        tokensRemaining: Math.max(0, remaining - cost),
        tokensUsed: used + cost,
        dailyLimit,
        eventType,
      };
    }, { maxWait: 10000, timeout: 20000 });

    if (!result.allowed) {
      if ((result as { missingUser?: boolean }).missingUser) {
        return NextResponse.json({ error: result.message, ...result }, { status: 404 });
      }
      return NextResponse.json({ error: result.message, ...result }, { status: 402 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to consume credits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
