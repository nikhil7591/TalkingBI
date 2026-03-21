"use client";

import { Pricing } from "@/components/ui/pricing";

const demoPlans = [
  {
    name: "STARTER",
    price: "49",
    yearlyPrice: "39",
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
    price: "99",
    yearlyPrice: "79",
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
    price: "249",
    yearlyPrice: "199",
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
    href: "/dashboard",
    isPopular: false,
  },
];

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-3xl border border-white/70 bg-white/80 shadow-[0_30px_80px_rgba(37,99,235,0.14)] backdrop-blur-sm">
        <Pricing
          plans={demoPlans}
          title="Simple, Transparent Pricing"
          description={"Choose the plan that works for you\nAll plans include access to our platform and BI automation."}
        />
      </div>
    </main>
  );
}
