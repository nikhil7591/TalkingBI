"use client";
import { useEffect, useState } from "react";

export default function CreditsResetTimer() {
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");

  useEffect(() => {
    const updateTimer = () => {
      // Get current time in IST timezone using browser's system time
      const now = new Date();
      const istFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      
      const parts = istFormatter.formatToParts(now);
      const istDate: { [key: string]: string } = {};
      parts.forEach(part => {
        istDate[part.type] = part.value;
      });
      
      const istHours = parseInt(istDate.hour || "0", 10);
      const istMinutes = parseInt(istDate.minute || "0", 10);
      const istSeconds = parseInt(istDate.second || "0", 10);
      
      // Calculate time until midnight (00:00) IST
      const hoursUntilMidnight = 23 - istHours;
      const minutesUntilMidnight = 59 - istMinutes;
      const secondsUntilMidnight = 59 - istSeconds;
      
      const formatted = `${String(hoursUntilMidnight).padStart(2, "0")}:${String(minutesUntilMidnight).padStart(2, "0")}:${String(secondsUntilMidnight).padStart(2, "0")}`;
      setTimeLeft(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-mono text-emerald-600">
      Reset: {timeLeft}
    </span>
  );
}
