import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type EventType = "KPI_QUERY" | "DASHBOARD_GENERATION" | "BI_CHAT_QUERY";

const DAILY_CREDITS: Record<string, number> = {
  free: 30,
  pro: 150,
  enterprise: 500,
  admin: 9_999_999,
};

const EVENT_COST: Record<EventType, number> = {
  KPI_QUERY: 5,
  DASHBOARD_GENERATION: 5,
  BI_CHAT_QUERY: 2,
};

const EVENT_METRIC: Record<EventType, "KPI_QUERY" | "DASHBOARD_GENERATION" | "BI_CHAT_QUERY"> = {
  KPI_QUERY: "KPI_QUERY",
  DASHBOARD_GENERATION: "DASHBOARD_GENERATION",
  BI_CHAT_QUERY: "BI_CHAT_QUERY",
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; userEmail?: string; eventType?: EventType };
    const userId = body.userId?.trim();
    const userEmail = body.userEmail?.trim().toLowerCase() || "";
    const eventType = body.eventType || "KPI_QUERY";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const cost = EVENT_COST[eventType] ?? EVENT_COST.KPI_QUERY;
    const metric = EVENT_METRIC[eventType] ?? EVENT_METRIC.KPI_QUERY;
    const now = new Date();
    const today = startOfUtcDay(now);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({
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
          user = await tx.user.findUnique({
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

        if (!user && userEmail) {
          user = await tx.user.create({
            data: {
              email: userEmail,
              name: userEmail.split("@")[0] || "User",
            },
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
          throw new Error("User not found");
        }

        const trackedUserId = user.id;

        const isAdmin = (user.email || "").toLowerCase() === "admin@gmail.com";
        const plan = (user.subscriptions[0]?.plan || "FREE").toLowerCase();
        const tierKey = isAdmin ? "admin" : plan;
        const dailyLimit = DAILY_CREDITS[tierKey] ?? DAILY_CREDITS.free;

        const usedAgg = await tx.usageEvent.aggregate({
          where: {
            userId: trackedUserId,
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
            userId: trackedUserId,
            metric,
            value: cost,
          },
        });

        return {
          allowed: true,
          tokensRemaining: Math.max(0, remaining - cost),
          tokensUsed: used + cost,
          dailyLimit,
        };
      });
    } catch (dbError) {
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError ||
        dbError instanceof Prisma.PrismaClientInitializationError
      ) {
        const isAdmin = userEmail === "admin@gmail.com";
        const dailyLimit = isAdmin ? DAILY_CREDITS.admin : DAILY_CREDITS.free;
        return NextResponse.json({
          allowed: true,
          tokensRemaining: dailyLimit,
          tokensUsed: 0,
          dailyLimit,
          warning: "Credit DB tables are unavailable. Generation allowed in fallback mode.",
        });
      }
      throw dbError;
    }

    if (!result.allowed) {
      return NextResponse.json({ error: result.message, ...result }, { status: 402 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to consume credits";
    return NextResponse.json({
      allowed: true,
      warning: message,
      tokensRemaining: DAILY_CREDITS.free,
      tokensUsed: 0,
      dailyLimit: DAILY_CREDITS.free,
    });
  }
}
