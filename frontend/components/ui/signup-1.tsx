"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthCardProps = {
  mode?: "signup" | "login";
};

export default function SignupOne({ mode = "signup" }: AuthCardProps) {
  const isSignup = mode === "signup";

  const header = useMemo(
    () =>
      isSignup
        ? {
            title: "Create your Talking BI account",
            subtitle: "Start building smart dashboards in minutes.",
            buttonText: "Create Account",
            switchText: "Already have an account?",
            switchLink: "/login",
            switchLabel: "Sign in",
          }
        : {
            title: "Welcome back to Talking BI",
            subtitle: "Sign in to continue your analytics journey.",
            buttonText: "Sign In",
            switchText: "New to Talking BI?",
            switchLink: "/signup",
            switchLabel: "Create account",
          },
    [isSignup]
  );

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8">
      <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-sky-200/35 blur-2xl" />
      <div className="absolute -bottom-20 -right-14 h-52 w-52 rounded-full bg-indigo-200/30 blur-2xl" />

      <div className="relative space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">TB</span>
            <span className="text-sm font-semibold text-slate-800">Talking BI</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{header.title}</h1>
          <p className="text-sm text-slate-600">{header.subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" type="text" placeholder="Enter your full name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter your password" />
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
            {header.buttonText}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-600">
          {header.switchText}{" "}
          <Link href={header.switchLink} className="font-semibold text-slate-900 hover:underline">
            {header.switchLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
