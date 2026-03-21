"use client";

import { useState } from "react";

type Props = {
  transcript: string;
};

export default function TextTranscript({ transcript }: Props) {
  const [copied, setCopied] = useState(false);
  const lines = transcript.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header with copy button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Dashboard Explanation</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Transcript text */}
      <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4">
        <div className="max-w-none text-sm leading-relaxed text-slate-200">
          {lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return <div key={idx} className="h-2" />;
            }

            const isHeading = /:$/.test(trimmed) || /^Chart\s+\d+:/i.test(trimmed) || /^चार्ट\s+\d+:/i.test(trimmed);
            return (
              <p
                key={idx}
                className={isHeading ? "mb-1 mt-3 font-semibold text-white" : "mb-2 whitespace-pre-wrap text-slate-200"}
              >
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-slate-500">
        Audio continues playing while viewing this transcript.
      </p>
    </div>
  );
}
