import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getDemoConversationById } from "@/lib/demo-conversation-store";
import { prisma } from "@/lib/prisma";

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

export async function GET(_: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: context.params.id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        kpi: parseMeta(conversation.kpi).kpi,
        dashboards: parseMeta(conversation.kpi).dashboards,
        createdAt: conversation.createdAt,
        messages: conversation.messages.map((m: { role: string; content: string; createdAt: Date }) => ({
          role: m.role === "ASSISTANT" ? "assistant" : "user",
          content: m.content,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch {
    const demo = getDemoConversationById(session.user.id, context.params.id);
    if (!demo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: {
        id: demo.id,
        title: demo.title,
        kpi: demo.kpi || null,
        dashboards: demo.dashboards || [],
        createdAt: demo.createdAt,
        messages: demo.messages,
        mode: "demo-fallback",
      },
    });
  }
}
