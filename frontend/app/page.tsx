"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { RainbowButton } from "@/components/ui/rainbow-button";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 h-full w-full lg:w-[64%]">
          <Spotlight className="z-20" size={520} />
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.90)_38%,rgba(255,255,255,0.18)_70%,transparent_100%)]" />

      <section className="relative z-30 mx-auto grid min-h-screen w-full max-w-[1700px] gap-6 px-4 py-8 md:px-8 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex min-h-[36vh] flex-col justify-center px-2 md:px-6"
        >
          <p className="mb-4 inline-flex w-fit rounded-full border border-slate-300 bg-white px-4 py-1 text-xs font-bold uppercase tracking-[0.26em] text-slate-700">
            AI Dashboard Copilot
          </p>

          <h1 className="text-5xl font-black leading-[0.92] tracking-tight text-slate-950 md:text-7xl lg:text-8xl">
            Talking BI
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium text-slate-700 md:text-2xl">
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

          <div className="mt-8 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          className="hidden h-full min-h-[420px] lg:block"
        />
      </section>
    </main>
  );
}
