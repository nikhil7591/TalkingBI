"""Voice service for generating explanations and TTS audio."""

from __future__ import annotations

import base64
import os
from typing import Any

try:
    from groq import Groq
except ImportError:  # Keep backend booting if groq isn't installed in active env.
    Groq = None


class VoiceService:
    """Generate explanations and audio for dashboards."""

    def __init__(self) -> None:
        self.groq_key = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        if self.groq_key and Groq is not None:
            self.groq_client = Groq(api_key=self.groq_key)
        else:
            self.groq_client = None

    def _extract_chart_outline(self, dashboard_spec: dict[str, Any]) -> list[str]:
        charts = dashboard_spec.get("charts", []) or []
        outline: list[str] = []
        for idx, chart in enumerate(charts, start=1):
            title = str(chart.get("title") or f"Chart {idx}").strip()
            ctype = str(chart.get("type") or "chart").strip()
            x_field = ""
            y_field = ""
            x_axis = chart.get("xAxis") or {}
            y_axis = chart.get("yAxis") or {}
            if isinstance(x_axis, dict):
                x_field = str(x_axis.get("field") or "").strip()
            if isinstance(y_axis, dict):
                y_field = str(y_axis.get("field") or "").strip()

            field_text = ""
            if x_field and y_field:
                field_text = f" (X: {x_field}, Y: {y_field})"
            elif x_field:
                field_text = f" (X: {x_field})"
            elif y_field:
                field_text = f" (Y: {y_field})"

            outline.append(f"{title} [{ctype}]{field_text}")
        return outline

    def _safe_float(self, value: Any) -> float | None:
        try:
            if value is None:
                return None
            return float(str(value).replace(",", "").replace("%", ""))
        except (TypeError, ValueError):
            return None

    def _describe_chart_step(self, chart: dict[str, Any], step: int) -> str:
        title = str(chart.get("title") or f"Chart {step}")
        ctype = str(chart.get("type") or "chart")
        x_axis = chart.get("xAxis") or {}
        y_axis = chart.get("yAxis") or {}
        x_field = str(x_axis.get("field") or "category") if isinstance(x_axis, dict) else "category"
        y_field = str(y_axis.get("field") or "value") if isinstance(y_axis, dict) else "value"
        rows = chart.get("data") or []

        top_label = None
        top_value = None
        first_value = None
        last_value = None

        if isinstance(rows, list) and rows:
            for idx, row in enumerate(rows):
                if not isinstance(row, dict):
                    continue
                candidate = self._safe_float(row.get(y_field))
                if candidate is None:
                    continue
                if first_value is None:
                    first_value = candidate
                last_value = candidate
                if top_value is None or candidate > top_value:
                    top_value = candidate
                    top_label = row.get(x_field)

        readable_type = ctype.replace("-", " ")
        what_shows = f"What it shows: {title} uses {readable_type} to compare {x_field} with {y_field}."

        if top_label is not None and top_value is not None:
            what_changed = f"What changed: strongest point is {top_label} near {top_value:.2f}."
        elif first_value is not None and last_value is not None and first_value != last_value:
            direction = "increased" if last_value > first_value else "decreased"
            what_changed = f"What changed: values {direction} from start to end."
        else:
            what_changed = "What changed: movement is stable, with no major spikes."

        why_matters = "Why it matters: this shows where performance is strong and where risk exists."
        action = "Action: scale top segments first, then improve weak segments with focused experiments."

        return " ".join(
            [
                f"Chart {step}:",
                what_shows,
                what_changed,
                why_matters,
                action,
            ]
        )

    def generate_explanation_text(self, dashboard_spec: dict[str, Any], kpi: str) -> str:
        """Generate a structured explanation with headings and chart-by-chart walkthrough."""
        try:
            title = dashboard_spec.get("title", "Dashboard")
            focus = dashboard_spec.get("focus", "analysis")
            kpi_cards = dashboard_spec.get("kpiCards", [])
            insight = dashboard_spec.get("insightText", "")
            charts = dashboard_spec.get("charts", []) or []
            chart_outline = self._extract_chart_outline(dashboard_spec)

            metrics_summary = "No KPI cards available."
            if kpi_cards:
                metrics_list = []
                for card in kpi_cards[:4]:
                    label = str(card.get("label") or "").strip()
                    value = str(card.get("formattedValue") or card.get("value") or "").strip()
                    if label and value:
                        metrics_list.append(f"{label}: {value}")
                metrics_summary = "; ".join([m for m in metrics_list if m.strip()]) or metrics_summary

            charts_text = "\n".join([f"{i}. {line}" for i, line in enumerate(chart_outline, start=1)]) if chart_outline else "1. No charts available"

            prompt = f"""You are a voice BI analyst.
Write clean narration text in simple English.
Pretend a product manager is briefing a boss for the first time.
Use short and clear sentences.
Most sentences should be 8 to 14 words.
Add natural stops using punctuation.
Use EXACT headings below and keep them in output:

Overview:
KPI Snapshot:
Chart Walkthrough:
Recommendation:

Context:
- KPI request: {kpi}
- Dashboard title: {title}
- Dashboard focus: {focus}
- KPI cards: {metrics_summary}
- Insight text: {insight}
- Charts in dashboard:
{charts_text}

Rules:
1) Under Chart Walkthrough, explain each chart one by one in numeric order.
2) For each chart step, use EXACT mini-structure:
    What it shows: ...
    What changed: ...
    Why it matters: ...
    Action: ...
3) Use chart-by-chart style: Chart 1, Chart 2, ...
4) Keep total narration around 80 to 120 seconds.
5) Keep text easy to read and easy to speak aloud.
6) Avoid generic repeated lines like "read this chart for pattern".
7) Do not use jargon. Keep it manager-friendly.

Return plain text only."""

            explanation = self._generate_with_llm(prompt)
            if explanation:
                # Guardrail: avoid repetitive low-quality script.
                low_quality_repeat = explanation.lower().count("read this chart for the main pattern first") >= 2
                missing_steps = (len(chart_outline) > 0) and (explanation.lower().count("step ") < min(len(chart_outline), 2))
                if low_quality_repeat or missing_steps:
                    return self._build_fallback_explanation(title, focus, metrics_summary, insight, chart_outline, charts)
                return explanation

            return self._build_fallback_explanation(title, focus, metrics_summary, insight, chart_outline, charts)

        except Exception as e:
            print(f"Error generating explanation: {e}")
            return self._build_fallback_explanation(
                dashboard_spec.get("title", "Dashboard"),
                dashboard_spec.get("focus", "analysis"),
                "No KPI cards available.",
                dashboard_spec.get("insightText", ""),
                self._extract_chart_outline(dashboard_spec),
                dashboard_spec.get("charts", []) or [],
            )

    def _generate_with_llm(self, prompt: str) -> str | None:
        """Generate explanation using Groq only for voice flow."""
        # Voice flow uses Groq as primary model.
        if self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.4,
                    max_tokens=700,
                )
                if response.choices and response.choices[0].message.content:
                    return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Groq error: {e}")

        return None

    def _generate_spoken_variants(self, base_text: str) -> dict[str, str]:
        """Generate language-specific spoken scripts for Web Speech playback."""
        variants = {
            "english": base_text,
            "hindi": self._fallback_hindi_text(base_text),
            "hinglish": self._fallback_hinglish_text(base_text),
        }

        translation_prompt = f"""You are a BI narrator.
Convert the following dashboard script into 3 spoken variants.

Requirements:
1) Keep meaning exactly same.
2) Keep headings and step numbers.
3) Keep short spoken-friendly sentences.
4) Return strict JSON with keys: english, hindi, hinglish.
5) Hindi should be in Devanagari script.
6) Hinglish should be mixed Hindi-English in Roman script.

Source script:
{base_text}
"""

        llm_result = self._generate_with_llm(translation_prompt)
        if not llm_result:
            return variants

        try:
            import json

            start = llm_result.find("{")
            end = llm_result.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return variants
            parsed = json.loads(llm_result[start : end + 1])

            for key in ["english", "hindi", "hinglish"]:
                value = parsed.get(key)
                if isinstance(value, str) and value.strip():
                    variants[key] = value.strip()
            return variants
        except Exception:
            return variants

    def _fallback_hindi_text(self, text: str) -> str:
        replacements = {
            "Overview:": "सारांश:",
            "KPI Snapshot:": "केपीआई स्नैपशॉट:",
            "Chart Walkthrough:": "चार्ट वॉकथ्रू:",
            "Recommendation:": "सिफारिश:",
            "Chart": "चार्ट",
            "What it shows:": "यह क्या दिखाता है:",
            "What changed:": "क्या बदला है:",
            "Why it matters:": "यह क्यों महत्वपूर्ण है:",
            "Action:": "कार्रवाई:",
            "This dashboard": "यह डैशबोर्ड",
            "Top KPI values are": "मुख्य KPI मान हैं",
            "Primary insight is": "मुख्य इनसाइट है",
            "Scale what works": "जो काम कर रहा है उसे स्केल करें",
        }
        result = text
        for src, dst in replacements.items():
            result = result.replace(src, dst)
        return result

    def _fallback_hinglish_text(self, text: str) -> str:
        replacements = {
            "Overview:": "Overview:",
            "KPI Snapshot:": "KPI Snapshot:",
            "Chart Walkthrough:": "Chart Walkthrough:",
            "Recommendation:": "Recommendation:",
            "What it shows:": "Kya dikh raha hai:",
            "What changed:": "Kya change hua:",
            "Why it matters:": "Yeh kyun important hai:",
            "Action:": "Action lena hai:",
            "This dashboard": "Yeh dashboard",
            "Top KPI values are": "Top KPI values hain",
            "Primary insight is": "Primary insight hai",
            "Scale what works": "Jo kaam kar raha hai use scale karo",
        }
        result = text
        for src, dst in replacements.items():
            result = result.replace(src, dst)
        return result

    def _build_fallback_explanation(
        self,
        title: str,
        focus: str,
        metrics: str,
        insight: str,
        chart_outline: list[str],
        charts: list[dict[str, Any]],
    ) -> str:
        """Build a fallback explanation with headings and chart steps."""
        chart_steps: list[str] = []
        if charts:
            for idx, chart in enumerate(charts, start=1):
                if isinstance(chart, dict):
                    chart_steps.append(self._describe_chart_step(chart, idx))
        else:
            for idx, item in enumerate(chart_outline, start=1):
                chart_steps.append(f"Chart {idx}: {item}. This chart explains one important business pattern.")

        if not chart_steps:
            chart_steps.append("Chart 1: No chart found. Review KPI cards for the trend.")

        return "\n".join(
            [
                "Overview:",
                f"This is {title}. It focuses on {focus} and decision clarity.",
                "This dashboard helps a first-time viewer understand performance quickly.",
                "",
                "KPI Snapshot:",
                f"Top KPI values are {metrics}.",
                f"Primary insight is {insight or 'watch trend movement across categories'}.",
                "These KPIs set context before reading individual charts.",
                "",
                "Chart Walkthrough:",
                *chart_steps,
                "",
                "Recommendation:",
                "Scale what works in top segments. Fix weak segments with focused actions.",
                "Run a weekly review to track improvement and course-correct quickly.",
            ]
        )

    def generate_audio_groq(self, text: str) -> bytes | None:
        """Generate audio using Groq API (via external service)."""
        # Note: Groq doesn't have direct TTS. We'll use an alternative approach.
        # For now, return None to fall back to frontend Web Speech API
        return None

    def generate_audio(self, text: str) -> bytes | None:
        """Generate audio for voice mode (currently frontend Web Speech fallback)."""
        return self.generate_audio_groq(text)

    def get_voice_explanation(self, dashboard_spec: dict[str, Any], kpi: str) -> dict[str, Any]:
        """Generate complete voice explanation with audio."""
        try:
            # Generate explanation text
            explanation_text = self.generate_explanation_text(dashboard_spec, kpi)
            spoken_variants = self._generate_spoken_variants(explanation_text)

            # Try to generate audio
            audio_bytes = self.generate_audio(explanation_text)

            if audio_bytes:
                # Encode audio as base64 for transmission
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                return {
                    "success": True,
                    "transcript": explanation_text,
                    "spokenVariants": spoken_variants,
                    "audio": f"data:audio/mpeg;base64,{audio_base64}",
                    "audioUrl": None,
                    "useWebSpeech": False,
                }
            else:
                # Return text only - frontend will use Web Speech API
                return {
                    "success": True,
                    "transcript": explanation_text,
                    "spokenVariants": spoken_variants,
                    "audio": None,
                    "audioUrl": None,
                    "useWebSpeech": True,
                }

        except Exception as e:
            print(f"Error in get_voice_explanation: {e}")
            return {
                "success": False,
                "transcript": "Unable to generate explanation at this time.",
                "spokenVariants": {
                    "english": "Unable to generate explanation at this time.",
                    "hindi": "इस समय व्याख्या उत्पन्न नहीं हो सकी।",
                    "hinglish": "Is samay explanation generate nahi ho saka.",
                },
                "audio": None,
                "audioUrl": None,
                "useWebSpeech": False,
                "error": str(e),
            }


# Singleton instance
voice_service = VoiceService()
