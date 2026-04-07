import axios from "axios";

import { buildDashboards } from "@/lib/DesignEngine";
import { AVAILABLE_THEMES, getThemeByName, THEME_KEYS } from "@/lib/themes";
import { ApiResponse, ChatConversationDetail, ChatConversationSummary, ChatMessage, DashboardSpec } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type CreditEventType = "KPI_QUERY" | "DASHBOARD_GENERATION" | "BI_CHAT_QUERY";

export type CreditStatusPayload = {
  tokensRemaining: number;
  dailyLimit: number;
  tokensUsed?: number;
  allowed?: boolean;
  warning?: string;
  plan?: string;
  activeSubscriptionName?: string;
};

function normalizeThemeKey(themeInput: string | undefined): string {
  if (!themeInput) return "dark-professional";
  const normalized = themeInput.trim().toLowerCase();
  if (THEME_KEYS.includes(normalized)) return normalized;

  const reverseThemeMap = new Map<string, string>();
  for (const key of THEME_KEYS) {
    reverseThemeMap.set(AVAILABLE_THEMES[key].name.toLowerCase(), key);
  }
  return reverseThemeMap.get(normalized) || "dark-professional";
}

export async function consumeCredits(payload: {
  userId: string;
  userEmail?: string;
  eventType: CreditEventType;
}): Promise<CreditStatusPayload> {
  const response = await axios.post("/api/credits/consume", payload, { timeout: 10000 });
  return {
    tokensRemaining: Number(response.data?.tokensRemaining || 0),
    dailyLimit: Number(response.data?.dailyLimit || 30),
    tokensUsed: Number(response.data?.tokensUsed || 0),
    allowed: Boolean(response.data?.allowed ?? true),
    warning: response.data?.warning,
  };
}

export async function getCreditsStatus(payload: {
  userId: string;
  userEmail?: string;
}): Promise<CreditStatusPayload> {
  const response = await axios.post("/api/credits/status", payload, { timeout: 10000 });
  return {
    tokensRemaining: Number(response.data?.tokensRemaining || 0),
    dailyLimit: Number(response.data?.dailyLimit || 30),
    tokensUsed: Number(response.data?.tokensUsed || 0),
    warning: response.data?.warning,
    plan: typeof response.data?.plan === "string" ? response.data.plan : undefined,
    activeSubscriptionName:
      typeof response.data?.activeSubscriptionName === "string"
        ? response.data.activeSubscriptionName
        : undefined,
  };
}

export async function generateDashboards(
  kpi: string,
  selectedCharts: string[],
  selectedThemes: string[] = [],
  options?: { userId?: string; userEmail?: string; sessionId?: string; useUrlDataset?: boolean }
): Promise<DashboardSpec[]> {
  try {
    if (options?.userId) {
      try {
        await consumeCredits({
          userId: options.userId,
          userEmail: options.userEmail,
          eventType: "DASHBOARD_GENERATION",
        });
      } catch (creditError) {
        if (axios.isAxiosError(creditError)) {
          const creditMsg =
            (creditError.response?.data as { error?: string; warning?: string } | undefined)?.error ||
            (creditError.response?.data as { warning?: string } | undefined)?.warning ||
            "Credits check failed.";
          throw new Error(creditMsg);
        }
        throw new Error("Credits check failed.");
      }
    }

    const response = await axios.post<ApiResponse>(`${API_URL}/gen-dashboard`, {
      kpi,
      selectedCharts,
      selectedThemes,
      user_id: options?.userId,
      session_id: options?.sessionId,
      use_url_dataset: Boolean(options?.useUrlDataset),
    }, { timeout: 45000 });

    if (response.data?.source === "url" && response.data?.doc2chart) {
      const preferredThemeKeys = (selectedThemes || []).map(normalizeThemeKey);
      const primaryTheme = preferredThemeKeys[0] || "dark-professional";

      const generated = buildDashboards(response.data.doc2chart as any, response.data.insights || {}, {
        theme: primaryTheme as any,
        selectedCharts: selectedCharts.length
          ? selectedCharts
          : ["line", "bar", "donut", "area", "combo", "heatmap", "sunburst", "waterfall"],
        layout: "executive",
        accentOverride: null,
      });

      return generated.map((dashboard, idx) => {
        const themeKey = preferredThemeKeys[idx] || primaryTheme;
        return {
          ...dashboard,
          theme: getThemeByName(themeKey),
        };
      });
    }

    if (!response.data?.dashboards?.length) {
      throw new Error("No dashboards were generated.");
    }

    if (!selectedThemes.length) {
      return response.data.dashboards;
    }

    const preferredThemeKeys = selectedThemes.map(normalizeThemeKey);
    const fallbackThemeKey = preferredThemeKeys[0] || "dark-professional";

    return response.data.dashboards.map((dashboard, idx) => {
      const key = preferredThemeKeys[idx] || fallbackThemeKey;
      return {
        ...dashboard,
        theme: getThemeByName(key),
      };
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { detail?: string } | undefined)?.detail ||
        "Unable to generate dashboards right now. Please try again.";
      throw new Error(message);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unexpected error while generating dashboards.");
  }
}

export async function ingestDataset(payload: {
  url: string;
  userId: string;
  sessionId: string;
}): Promise<{
  dataset_id: string;
  session_id: string;
  columns: Array<{ name: string; dtype: string }>;
  row_count: number;
  sample_rows: Array<Record<string, unknown>>;
  overview?: {
    source_type?: string;
    cloud_provider?: string;
    database_engine?: string | null;
    row_count?: number;
    column_count?: number;
    numeric_columns?: string[];
    categorical_columns?: string[];
    date_columns?: string[];
    missing_cells?: number;
    duplicate_rows?: number;
    top_missing_columns?: Array<{ column: string; missing: number }>;
  };
  deepprep?: {
    quality_issues?: string[];
    transformations?: string[];
    cleaned_row_count?: number;
    cleaned_sample_rows?: Array<Record<string, unknown>>;
  };
  message: string;
}> {
  try {
    const response = await axios.post(`${API_URL}/dataset/ingest`, {
      url: payload.url,
      user_id: payload.userId,
      session_id: payload.sessionId,
    }, { timeout: 40000 });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { detail?: string } | undefined)?.detail ||
        "Unable to ingest dataset URL right now.";
      throw new Error(message);
    }
    throw new Error("Unexpected error while ingesting dataset URL.");
  }
}

export async function cleanupDataset(sessionId: string): Promise<{ deleted: number; message: string }> {
  const response = await axios.delete(`${API_URL}/dataset/cleanup/${sessionId}`, { timeout: 15000 });
  return response.data;
}

export async function getDatasetStatus(sessionId: string): Promise<{ exists: boolean; columns: Array<{ name: string; dtype: string }>; row_count: number }> {
  const response = await axios.get(`${API_URL}/dataset/status/${sessionId}`, { timeout: 15000 });
  return response.data;
}

export async function generateVoiceExplanation(
  dashboardSpec: DashboardSpec,
  kpi: string
): Promise<{
  transcript: string;
  spokenVariants: { english: string; hindi: string; hinglish: string };
  audio: string | null;
  useWebSpeech: boolean;
}> {
  try {
    const response = await axios.post(`${API_URL}/voice-explanation`, {
      dashboardSpec,
      kpi,
    }, { timeout: 20000 });

    return {
      transcript: response.data?.transcript || "",
      spokenVariants: {
        english: response.data?.spokenVariants?.english || response.data?.transcript || "",
        hindi: response.data?.spokenVariants?.hindi || response.data?.transcript || "",
        hinglish: response.data?.spokenVariants?.hinglish || response.data?.transcript || "",
      },
      audio: response.data?.audio || null,
      useWebSpeech: Boolean(response.data?.useWebSpeech),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Voice explanation API error:", error.response?.data || error.message);
    }
    return {
      transcript: "Unable to generate voice explanation at this time. Please try again.",
      spokenVariants: {
        english: "Unable to generate voice explanation at this time. Please try again.",
        hindi: "इस समय वॉइस व्याख्या उपलब्ध नहीं है। कृपया दोबारा प्रयास करें।",
        hinglish: "Is time voice explanation available nahi hai. Please phir try karein.",
      },
      audio: null,
      useWebSpeech: true,
    };
  }
}

export async function askBiChat(payload: {
  question: string;
  kpi: string;
  dashboardSpec: DashboardSpec;
  userName?: string;
  userId?: string;
}): Promise<{ answer: string; sources: string[] }> {
  try {
    const response = await axios.post(`${API_URL}/bi-chat`, payload, { timeout: 30000 });
    return {
      answer: response.data?.answer || "",
      sources: response.data?.sources || [],
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { detail?: string } | undefined)?.detail ||
        "Unable to answer BI question right now.";
      throw new Error(message);
    }
    throw new Error("Unexpected error while asking BI chatbot.");
  }
}

export async function saveConversation(payload: {
  title: string;
  kpi?: string;
  dashboardTitles?: string[];
  messages: ChatMessage[];
}): Promise<{ id: string }> {
  const response = await axios.post("/api/conversations", payload, { timeout: 15000 });
  return { id: response.data?.id || "" };
}

export async function listConversations(): Promise<ChatConversationSummary[]> {
  const response = await axios.get("/api/conversations", { timeout: 15000 });
  return response.data?.conversations || [];
}

export async function getConversation(id: string): Promise<ChatConversationDetail> {
  const response = await axios.get(`/api/conversations/${id}`, { timeout: 15000 });
  return response.data?.conversation;
}
