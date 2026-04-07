"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
    buttonText: "Choose Enterprise",
    href: "/dashboard",
    isPopular: false,
  },
];

export default function PlansPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [darkMode, setDarkMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: string;
    yearlyPrice: string;
    features: string[];
    billingCycle: "monthly" | "annual";
  } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [paymentStep, setPaymentStep] = useState<"phone" | "otp" | "success">("phone");
  const [paymentError, setPaymentError] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationMeta, setActivationMeta] = useState<{
    activeSubscriptionName: string;
    dailyLimit: number;
    benefits: string[];
    warning?: string;
  } | null>(null);

  useEffect(() => {
    const storedMode = localStorage.getItem("talkingbi_mode");
    setDarkMode(storedMode === "dark");
  }, []);

  const payableAmount = useMemo(() => {
    if (!selectedPlan) {
      return "0";
    }
    return selectedPlan.billingCycle === "monthly" ? selectedPlan.price : selectedPlan.yearlyPrice;
  }, [selectedPlan]);

  const closePaymentModal = () => {
    setSelectedPlan(null);
    setPhoneNumber("");
    setEnteredOtp("");
    setDemoOtp("");
    setPaymentError("");
    setPaymentStep("phone");
    setActivating(false);
    setActivationMeta(null);
  };

  const sendDemoOtp = () => {
    setPaymentError("");
    if (!session?.user?.id) {
      setPaymentError("Please login first to activate selected subscription.");
      return;
    }

    const normalizedPhone = phoneNumber.replace(/\s+/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
      setPaymentError("Please enter a valid phone number.");
      return;
    }

    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setDemoOtp(generated);
    setPaymentStep("otp");
  };

  const activateSubscription = async () => {
    if (!selectedPlan) {
      return;
    }
    setPaymentError("");

    if (enteredOtp.trim() !== demoOtp) {
      setPaymentError("Invalid OTP. Please use the demo OTP shown above.");
      return;
    }

    setActivating(true);
    try {
      const response = await fetch("/api/subscription/demo-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          plan: selectedPlan.name,
          billingCycle: selectedPlan.billingCycle,
          phone: phoneNumber,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        warning?: string;
        activeSubscriptionName?: string;
        dailyLimit?: number;
        benefits?: string[];
        plan?: string;
      };

      if (!response.ok) {
        setPaymentError(data.error || "Unable to activate demo subscription right now.");
        return;
      }

      const localSubscription = {
        plan: data.plan || "free",
        activeSubscriptionName: data.activeSubscriptionName || selectedPlan.name,
        dailyLimit: Number(data.dailyLimit || 30),
        benefits: data.benefits || selectedPlan.features,
        billingCycle: selectedPlan.billingCycle,
        activatedAt: new Date().toISOString(),
      };
      localStorage.setItem("talkingbi_active_subscription", JSON.stringify(localSubscription));

      setActivationMeta({
        activeSubscriptionName: localSubscription.activeSubscriptionName,
        dailyLimit: localSubscription.dailyLimit,
        benefits: localSubscription.benefits,
        warning: data.warning,
      });
      setPaymentStep("success");
    } catch {
      setPaymentError("Activation failed. Please try again.");
    } finally {
      setActivating(false);
    }
  };

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
          onSelectPlan={(plan, billingCycle) => {
            setSelectedPlan({
              name: plan.name,
              price: plan.price,
              yearlyPrice: plan.yearlyPrice,
              features: plan.features,
              billingCycle,
            });
            setPhoneNumber("");
            setEnteredOtp("");
            setDemoOtp("");
            setPaymentError("");
            setPaymentStep("phone");
            setActivationMeta(null);
          }}
        />
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Demo Payment - {selectedPlan.name}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Amount: INR {payableAmount} ({selectedPlan.billingCycle})
            </p>

            {paymentStep === "phone" && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Phone Number</label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                />
                {!session?.user?.id && (
                  <p className="text-xs font-medium text-rose-600">Login required before activating subscription credits.</p>
                )}
                {paymentError && <p className="text-xs font-medium text-rose-600">{paymentError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={sendDemoOtp}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Send OTP
                  </button>
                </div>
              </div>
            )}

            {paymentStep === "otp" && (
              <div className="mt-4 space-y-3">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Demo OTP (for testing): {demoOtp}
                </p>
                <label className="block text-sm font-semibold text-slate-700">Enter OTP</label>
                <input
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="Enter 6 digit OTP"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                />
                {paymentError && <p className="text-xs font-medium text-rose-600">{paymentError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStep("phone")}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void activateSubscription()}
                    disabled={activating}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {activating ? "Activating..." : "Verify and Activate"}
                  </button>
                </div>
              </div>
            )}

            {paymentStep === "success" && activationMeta && (
              <div className="mt-4 space-y-3">
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  Subscription activated: {activationMeta.activeSubscriptionName}
                </p>
                <p className="text-sm text-slate-700">Daily Credits: {activationMeta.dailyLimit}</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Benefits Enabled</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {activationMeta.benefits.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                {activationMeta.warning ? <p className="text-xs font-medium text-amber-700">{activationMeta.warning}</p> : null}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closePaymentModal();
                      router.push("/dashboard");
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
