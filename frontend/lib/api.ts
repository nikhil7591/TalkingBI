import axios from "axios";

import { ApiResponse, DashboardSpec } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateDashboards(kpi: string, selectedCharts: string[], selectedThemes: string[] = []): Promise<DashboardSpec[]> {
  try {
    const response = await axios.post<ApiResponse>(`${API_URL}/generate-dashboard`, {
      kpi,
      selectedCharts,
      selectedThemes,
    }, { timeout: 45000 });

    if (!response.data?.dashboards?.length) {
      throw new Error("No dashboards were generated.");
    }

    return response.data.dashboards;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { detail?: string } | undefined)?.detail ||
        "Unable to generate dashboards right now. Please try again.";
      throw new Error(message);
    }
    throw new Error("Unexpected error while generating dashboards.");
  }
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
