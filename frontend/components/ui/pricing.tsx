"use client";

import { buttonVariants } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
  currencyCode?: string;
  annualDiscountLabel?: string;
  darkMode?: boolean;
  onSelectPlan?: (plan: PricingPlan, billingCycle: "monthly" | "annual") => void;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
  currencyCode = "USD",
  annualDiscountLabel = "Save 20%",
  darkMode = false,
  onSelectPlan,
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const toggleRef = useRef<HTMLDivElement>(null);

  const setBilling = (nextIsMonthly: boolean) => {
    if (isMonthly === nextIsMonthly) {
      return;
    }
    setIsMonthly(nextIsMonthly);

    if (!nextIsMonthly && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#2563eb", "#0891b2", "#7c3aed", "#f59e0b"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="container py-20">
      <div className="mb-12 space-y-4 text-center">
        <h2 className={cn("text-4xl font-bold tracking-tight sm:text-5xl", darkMode ? "text-white" : "text-slate-900")}>{title}</h2>
        <p className={cn("whitespace-pre-line text-lg", darkMode ? "text-slate-300" : "text-slate-600")}>{description}</p>
      </div>

      <div className="mb-10 flex justify-center">
        <div
          ref={toggleRef}
          className={cn(
            "relative inline-flex items-center gap-0 rounded-full border p-1 shadow-sm",
            darkMode ? "border-slate-500 bg-slate-800/95" : "border-slate-300 bg-white"
          )}
        >
          <button
            type="button"
            onClick={() => setBilling(true)}
            className={cn(
              "relative z-10 w-24 rounded-full py-2.5 text-sm font-semibold transition",
              isMonthly
                ? darkMode
                  ? "bg-slate-700 text-white shadow-md"
                  : "bg-slate-100 text-slate-900 shadow-md"
                : darkMode
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-600 hover:text-slate-700"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling(false)}
            className={cn(
              "relative z-10 w-24 rounded-full py-2.5 text-sm font-semibold transition",
              !isMonthly
                ? darkMode
                  ? "bg-slate-700 text-white shadow-md"
                  : "bg-slate-100 text-slate-900 shadow-md"
                : darkMode
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-600 hover:text-slate-700"
            )}
          >
            Annual
          </button>
          <span className="absolute -right-32 top-1/2 whitespace-nowrap -translate-y-1/2 text-xs font-semibold text-blue-500">{annualDiscountLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.1,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.2,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              "relative flex flex-col rounded-2xl border-[1px] p-6 text-center lg:flex lg:flex-col lg:justify-center",
              plan.isPopular
                ? "border-blue-500 border-2 bg-blue-600 text-white"
                : darkMode
                  ? "border-slate-700 bg-slate-900/85 text-white"
                  : "border-slate-200 bg-white text-slate-900",
              !plan.isPopular && "mt-5",
              index === 0 || index === 2
                ? "z-0 -translate-z-[50px] translate-x-0 translate-y-0 transform rotate-y-[10deg]"
                : "z-10",
              index === 0 && "origin-right",
              index === 2 && "origin-left"
            )}
          >
            {plan.isPopular && (
              <div className="absolute right-0 top-0 flex items-center rounded-bl-xl rounded-tr-xl bg-white px-2 py-0.5">
                <Star className="h-4 w-4 fill-current text-blue-600" />
                <span className="ml-1 font-sans font-semibold text-blue-600">Popular</span>
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <p className={cn("text-base font-semibold", plan.isPopular ? "text-blue-100" : darkMode ? "text-slate-300" : "text-slate-500")}>{plan.name}</p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight">
                  <NumberFlow
                    value={isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)}
                    format={{
                      style: "currency",
                      currency: currencyCode,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                    transformTiming={{ duration: 500, easing: "ease-out" }}
                    willChange
                    className="tabular-nums"
                  />
                </span>
                {plan.period !== "Next 3 months" && (
                  <span className={cn("text-sm font-semibold leading-6 tracking-wide", plan.isPopular ? "text-blue-100" : darkMode ? "text-slate-300" : "text-slate-500")}>
                    / {plan.period}
                  </span>
                )}
              </div>

              <p className={cn("text-xs leading-5", plan.isPopular ? "text-blue-100" : darkMode ? "text-slate-300" : "text-slate-500")}>
                {isMonthly ? "billed monthly" : "billed annually"}
              </p>

              <ul className="mt-5 flex flex-col gap-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className={cn("mt-1 h-4 w-4 flex-shrink-0", plan.isPopular ? "text-white" : "text-blue-600")} />
                    <span className="text-left">{feature}</span>
                  </li>
                ))}
              </ul>

              <hr className={cn("my-4 w-full", plan.isPopular ? "border-blue-300/40" : darkMode ? "border-slate-700" : "border-slate-200")} />

              {onSelectPlan && !/^https?:\/\//i.test(plan.href) ? (
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan, isMonthly ? "monthly" : "annual")}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter transform-gpu transition-all duration-300 ease-out",
                    plan.isPopular
                      ? "border-white bg-white text-blue-700 hover:bg-blue-50"
                      : "ring-offset-current hover:bg-blue-600 hover:text-white hover:ring-2 hover:ring-blue-500 hover:ring-offset-1"
                  )}
                >
                  {plan.buttonText}
                </button>
              ) : (
                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter transform-gpu transition-all duration-300 ease-out",
                    plan.isPopular
                      ? "border-white bg-white text-blue-700 hover:bg-blue-50"
                      : "ring-offset-current hover:bg-blue-600 hover:text-white hover:ring-2 hover:ring-blue-500 hover:ring-offset-1"
                  )}
                >
                  {plan.buttonText}
                </Link>
              )}
              <p className={cn("mt-6 text-xs leading-5", plan.isPopular ? "text-blue-100" : darkMode ? "text-slate-300" : "text-slate-500")}>{plan.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
