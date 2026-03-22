import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { listDemoConversations, saveDemoConversation } from "@/lib/demo-conversation-store";
import { prisma } from "@/lib/prisma";

function encodeMeta(kpi?: string, dashboardTitles?: string[]): string {
  return JSON.stringify({
    kpi: kpi || "",
    dashboards: (dashboardTitles || []).slice(0, 6),
  });
}

function parseMeta(raw: string | null): { kpi: string | null; dashboards: string[] } {
  if (!raw) {
    return { kpi: null, dashboards: [] };
  }
  try {
    const parsed = JSON.parse(raw) as { kpi?: string; dashboards?: string[] };
    if (typeof parsed === "object") {
      return {
        kpi: parsed.kpi || null,
        dashboards: Array.isArray(parsed.dashboards) ? parsed.dashboards.slice(0, 6) : [],
      };
    }
  } catch {
    // Older plain-kpi string values.
  }
  return { kpi: raw, dashboards: [] };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c: { id: string; title: string; kpi: string | null; createdAt: Date; updatedAt: Date; messages: Array<{ role: string; content: string }> }) => {
        const meta = parseMeta(c.kpi);
        return {
          id: c.id,
          title: c.title,
          kpi: meta.kpi,
          dashboards: meta.dashboards,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          preview: c.messages.find((m: { role: string }) => m.role === "USER")?.content?.slice(0, 90) || c.title,
        };
      }),
    });
  } catch {
    const demo = listDemoConversations(session.user.id);
    return NextResponse.json({
      conversations: demo.map((c) => ({
        id: c.id,
        title: c.title,
        kpi: c.kpi || null,
        dashboards: c.dashboards || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        preview: c.messages.find((m) => m.role === "user")?.content?.slice(0, 90) || c.title,
        mode: "demo-fallback",
      })),
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      title: string;
      kpi?: string;
      dashboardTitles?: string[];
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!body?.title || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    try {
      const conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: body.title.slice(0, 140),
          kpi: encodeMeta(body.kpi, body.dashboardTitles),
          messages: {
            create: body.messages.map((m) => ({
              role: m.role === "assistant" ? "ASSISTANT" : "USER",
              content: m.content,
            })),
          },
        },
      });

      return NextResponse.json({ id: conversation.id });
    } catch {
      const created = saveDemoConversation({
        userId: session.user.id,
        title: body.title.slice(0, 140),
        kpi: body.kpi,
        dashboards: body.dashboardTitles,
        messages: body.messages,
      });
      return NextResponse.json({ id: created.id, mode: "demo-fallback" });
    }
  } catch {
    return NextResponse.json({ error: "Could not save conversation." }, { status: 500 });
  }
}
