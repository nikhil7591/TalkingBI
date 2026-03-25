"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { RainbowButton } from "@/components/ui/rainbow-button";
import { Card } from "@/components/ui/card";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

export default function HomePage() {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedMode = localStorage.getItem("talkingbi_mode");
    if (storedMode === "dark" || storedMode === "light") {
      setMode(storedMode);
    }
  }, []);

  const isDark = mode === "dark";

  return (
    <main className={`relative min-h-screen overflow-hidden px-4 py-4 md:px-8 md:py-6 ${isDark ? "bg-slate-950" : "bg-white"}`}>
      <div className={`pointer-events-none absolute inset-0 ${isDark ? "bg-[radial-gradient(circle_at_20%_15%,rgba(148,163,184,0.16),transparent_45%),radial-gradient(circle_at_80%_82%,rgba(99,102,241,0.16),transparent_45%)]" : "bg-[radial-gradient(circle_at_20%_15%,rgba(15,23,42,0.09),transparent_45%),radial-gradient(circle_at_80%_82%,rgba(15,23,42,0.07),transparent_45%)]"}`} />

      <section className="relative mx-auto grid h-[calc(100vh-2rem)] w-full max-w-[1700px] gap-6 lg:grid-cols-[0.95fr_1.25fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex min-h-[36vh] flex-col justify-center px-2 md:px-6"
        >
          <p className={`mb-4 inline-flex w-fit rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-[0.26em] ${isDark ? "border-slate-600 bg-slate-900 text-slate-200" : "border-slate-300 bg-white text-slate-700"}`}>
            AI Dashboard Copilot
          </p>

          <h1 className={`text-5xl font-black leading-[0.92] tracking-tight md:text-7xl lg:text-8xl ${isDark ? "text-white" : "text-slate-950"}`}>
            Talking BI
          </h1>
          <p className={`mt-5 max-w-2xl text-lg font-medium md:text-2xl ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            Build Interactive Dashboards with just KPI queries
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/dashboard">
              <RainbowButton className="h-14 min-w-[240px] text-lg tracking-wide">START FOR FREE</RainbowButton>
            </Link>
            <Link href="/plans">
              <RainbowButton className="h-14 min-w-[200px] text-lg tracking-wide">TRY PLANS</RainbowButton>
            </Link>
          </div>

          <div className="mt-8 max-w-2xl overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
              alt="Business analytics dashboard mood board"
              className="h-40 w-full object-cover"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          className="min-h-[420px] h-full"
        >
          <div className={`relative h-full w-full overflow-hidden rounded-[32px] ${isDark ? "bg-slate-950" : "bg-white"}`}>
            <Spotlight className="z-10" size={420} />
            <div className="relative z-20 h-full w-full">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="h-full w-full"
              />
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
