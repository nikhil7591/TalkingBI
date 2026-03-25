"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon } from "lucide-react";

import { Pricing } from "@/components/ui/pricing";

const demoPlans = [
  {
    name: "STARTER",
    price: "299",
    yearlyPrice: "199",
    period: "per month",
    features: [
      "Up to 10 KPI requests/day",
      "Interactive dashboard export",
      "Basic BI chatbot",
      "Community support",
    ],
    description: "Perfect for individual analysts and students.",
    buttonText: "Start Free Trial",
    href: "/dashboard",
    isPopular: false,
  },
  {
    name: "PROFESSIONAL",
    price: "599",
    yearlyPrice: "399",
    period: "per month",
    features: [
      "Unlimited KPI requests",
      "Advanced dashboard styles",
      "Voice + chatbot insights",
      "Priority response",
      "Team collaboration",
    ],
    description: "Best for growing teams shipping BI workflows daily.",
    buttonText: "Get Started",
    href: "/dashboard",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    price: "1299",
    yearlyPrice: "899",
    period: "per month",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "Governance and SSO",
      "SLA support",
    ],
    description: "For organizations with security and scale requirements.",
    buttonText: "Contact Sales",
    href: "https://mail.google.com/mail/?view=cm&fs=1&to=madhavkalra2005@gmail.com&su=Talking%20BI%20Enterprise%20Plan%20Inquiry",
    isPopular: false,
  },
];

export default function PlansPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem("talkingbi_mode");
    setDarkMode(storedMode === "dark");
  }, []);

  return (
    <main className={`min-h-screen px-4 py-8 md:px-8 ${darkMode ? "bg-[linear-gradient(180deg,#020617_0%,#0f172a_60%,#111827_100%)]" : "bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]"}`}>
      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-xl ${darkMode ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100" : "border-cyan-300 bg-cyan-50 text-cyan-800"}`}
        >
          Go to Dashboard
        </Link>
        <button
          type="button"
          onClick={() => setDarkMode((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-xl ${darkMode ? "border-slate-600 bg-slate-900/70 text-white" : "border-slate-300 bg-white/80 text-slate-900"}`}
        >
          <Moon className="h-4 w-4" />
          {darkMode ? "Dark Theme" : "Light Theme"}
        </button>
      </div>

      <div className={`mx-auto w-full max-w-7xl rounded-3xl border shadow-[0_30px_80px_rgba(37,99,235,0.14)] backdrop-blur-sm ${darkMode ? "border-slate-700/70 bg-slate-900/60" : "border-white/70 bg-white/80"}`}>
        <Pricing
          plans={demoPlans}
          title="Simple, Transparent Pricing"
          description={"Choose the plan that works for you\nAnnual plans unlock major savings with lower effective monthly cost."}
          currencyCode="INR"
          annualDiscountLabel="Save up to 35%"
          darkMode={darkMode}
        />
      </div>
    </main>
  );
}
