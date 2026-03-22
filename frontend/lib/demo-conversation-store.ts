import { ChatMessage } from "@/lib/types";

type DemoConversation = {
  id: string;
  userId: string;
  title: string;
  kpi?: string;
  dashboards?: string[];
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

declare global {
  var __talkingBiDemoConversations: DemoConversation[] | undefined;
}

const conversations = global.__talkingBiDemoConversations || [];
if (!global.__talkingBiDemoConversations) {
  global.__talkingBiDemoConversations = conversations;
}

export function listDemoConversations(userId: string): DemoConversation[] {
  return conversations
    .filter((c) => c.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function saveDemoConversation(input: {
  userId: string;
  title: string;
  kpi?: string;
  dashboards?: string[];
  messages: ChatMessage[];
}): DemoConversation {
  const now = new Date().toISOString();
  const created: DemoConversation = {
    id: `demo-conv-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    userId: input.userId,
    title: input.title,
    kpi: input.kpi,
    dashboards: input.dashboards || [],
    createdAt: now,
    updatedAt: now,
    messages: input.messages,
  };
  conversations.unshift(created);
  return created;
}

export function getDemoConversationById(userId: string, id: string): DemoConversation | null {
  return conversations.find((c) => c.userId === userId && c.id === id) || null;
}
