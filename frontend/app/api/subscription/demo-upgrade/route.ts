import { PlanTier, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BillingCycle = "monthly" | "annual";

type DemoPlanInfo = {
  tier: PlanTier;
  planKey: "free" | "pro" | "enterprise";
  displayName: "Starter" | "Professional" | "Enterprise";
  dailyLimit: number;
  benefits: string[];
};

const PLAN_MAP: Record<string, DemoPlanInfo> = {
  starter: {
    tier: "FREE",
    planKey: "free",
    displayName: "Starter",
    dailyLimit: 30,
    benefits: ["30 daily credits", "Core dashboard generation", "Basic BI chatbot"],
  },
  free: {
    tier: "FREE",
    planKey: "free",
    displayName: "Starter",
    dailyLimit: 30,
    benefits: ["30 daily credits", "Core dashboard generation", "Basic BI chatbot"],
  },
  professional: {
    tier: "PRO",
    planKey: "pro",
    displayName: "Professional",
    dailyLimit: 150,
    benefits: ["150 daily credits", "Premium chart unlock", "Faster BI workflow"],
  },
  pro: {
    tier: "PRO",
    planKey: "pro",
    displayName: "Professional",
    dailyLimit: 150,
    benefits: ["150 daily credits", "Premium chart unlock", "Faster BI workflow"],
  },
  enterprise: {
    tier: "ENTERPRISE",
    planKey: "enterprise",
    displayName: "Enterprise",
    dailyLimit: 500,
    benefits: ["500 daily credits", "All premium dashboards", "Priority support mode"],
  },
};

function normalizePlan(planRaw: string | undefined): DemoPlanInfo | null {
  const key = (planRaw || "").trim().toLowerCase();
  return PLAN_MAP[key] || null;
}

function normalizeBillingCycle(rawCycle: string | undefined): BillingCycle {
  return rawCycle === "annual" ? "annual" : "monthly";
}

function computePeriodEnd(start: Date, billingCycle: BillingCycle): Date {
  const periodEnd = new Date(start);
  if (billingCycle === "annual") {
    periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  } else {
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  }
  return periodEnd;
}

export async function POST(req: Request) {
  let selectedPlan: DemoPlanInfo | null = null;
  let billingCycle: BillingCycle = "monthly";

  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const body = (await req.json()) as {
      userId?: string;
      userEmail?: string;
      plan?: string;
      billingCycle?: string;
      phone?: string;
    };

    selectedPlan = normalizePlan(body.plan);
    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }
    const planForActivation = selectedPlan;

    billingCycle = normalizeBillingCycle(body.billingCycle);

    const normalizedPhone = (body.phone || "").replace(/\s+/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: "Valid phone number is required for demo payment." }, { status: 400 });
    }

    const bodyUserId = (body.userId || "").trim();
    const bodyUserEmail = (body.userEmail || "").trim().toLowerCase();

    if (session?.user?.id && bodyUserId && session.user.id !== bodyUserId) {
      return NextResponse.json({ error: "Session mismatch while upgrading subscription." }, { status: 403 });
    }

    const effectiveUserId = session?.user?.id || bodyUserId;
    const effectiveUserEmail = (session?.user?.email || bodyUserEmail || "").trim().toLowerCase();

    if (!effectiveUserId && !effectiveUserEmail) {
      return NextResponse.json({ error: "Please log in before activating a subscription." }, { status: 401 });
    }

    const periodStart = new Date();
    const periodEnd = computePeriodEnd(periodStart, billingCycle);

    const updated = await prisma.$transaction(async (tx) => {
      let user =
        effectiveUserId
          ? await tx.user.findUnique({
              where: { id: effectiveUserId },
              select: { id: true, email: true, name: true },
            })
          : null;

      if (!user && effectiveUserEmail) {
        user = await tx.user.findUnique({
          where: { email: effectiveUserEmail },
          select: { id: true, email: true, name: true },
        });
      }

      if (!user && effectiveUserEmail) {
        user = await tx.user.create({
          data: {
            email: effectiveUserEmail,
            name: effectiveUserEmail.split("@")[0] || "User",
          },
          select: { id: true, email: true, name: true },
        });
      }

      if (!user) {
        throw new Error("User account not found for subscription activation.");
      }

      await tx.subscription.updateMany({
        where: { userId: user.id, status: "active" },
        data: { status: "inactive" },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          plan: planForActivation.tier,
          status: "active",
          periodStart,
          periodEnd,
        },
        select: {
          id: true,
          userId: true,
          plan: true,
          periodStart: true,
          periodEnd: true,
        },
      });

      return {
        userId: user.id,
        email: user.email,
        subscription,
      };
    });

    return NextResponse.json({
      ok: true,
      persisted: true,
      userId: updated.userId,
      userEmail: updated.email,
      plan: planForActivation.planKey,
      activeSubscriptionName: planForActivation.displayName,
      billingCycle,
      dailyLimit: planForActivation.dailyLimit,
      benefits: planForActivation.benefits,
      periodStart: updated.subscription.periodStart,
      periodEnd: updated.subscription.periodEnd,
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        warning: "Database is unavailable. Demo subscription activated only in UI mode.",
        plan: selectedPlan?.planKey || "free",
        activeSubscriptionName: selectedPlan?.displayName || "Starter",
        billingCycle,
        dailyLimit: selectedPlan?.dailyLimit || 30,
        benefits: selectedPlan?.benefits || ["30 daily credits", "Core dashboard generation"],
      });
    }

    const message = error instanceof Error ? error.message : "Unable to activate demo subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
