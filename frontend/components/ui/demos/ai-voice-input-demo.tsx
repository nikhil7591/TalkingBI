"use client";

import { useState } from "react";

import { AIVoiceInput } from "@/components/ui/ai-voice-input";

export function AIVoiceInputDemo() {
  const [recordings, setRecordings] = useState<{ duration: number; timestamp: Date }[]>([]);

  const handleStop = (duration: number) => {
    setRecordings((prev) => [...prev.slice(-4), { duration, timestamp: new Date() }]);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <AIVoiceInput onStart={() => console.log("Recording started")} onStop={handleStop} />
      </div>
      <div className="space-y-1 text-sm text-slate-600">
        {recordings.map((rec, idx) => (
          <div key={`${rec.timestamp.toISOString()}-${idx}`}>
            Recording {idx + 1}: {rec.duration}s
          </div>
        ))}
      </div>
    </div>
  );
}
