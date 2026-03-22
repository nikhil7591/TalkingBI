"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Moon, Palette, RotateCcw, Sun } from "lucide-react";

const PALETTES = [
  "#f8f9fb",
  "linear-gradient(125deg,#ffe4e6 0%,#fce7f3 45%,#fff1f2 100%)",
  "linear-gradient(125deg,#fee2e2 0%,#ffedd5 45%,#fff7ed 100%)",
  "linear-gradient(125deg,#dcfce7 0%,#d1fae5 45%,#ecfdf5 100%)",
  "linear-gradient(125deg,#dbeafe 0%,#e0e7ff 45%,#eff6ff 100%)",
  "linear-gradient(125deg,#ede9fe 0%,#f5d0fe 45%,#faf5ff 100%)",
  "linear-gradient(125deg,#111827 0%,#1f2937 45%,#0f172a 100%)",
  "linear-gradient(125deg,#ffedd5 0%,#fde68a 45%,#fff7ed 100%)",
];

export default function TopNavbar() {
  const { data: session } = useSession();
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedIdx = Number(localStorage.getItem("talkingbi_palette_idx") || "0");
    const safeIdx = Number.isFinite(storedIdx) ? Math.max(0, Math.min(PALETTES.length - 1, storedIdx)) : 0;
    setPaletteIdx(safeIdx);

    const storedMode = localStorage.getItem("talkingbi_mode");
    if (storedMode === "dark" || storedMode === "light") {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("talkingbi_palette_idx", String(paletteIdx));
    document.documentElement.style.setProperty("--page-bg", PALETTES[paletteIdx]);
  }, [paletteIdx]);

  useEffect(() => {
    localStorage.setItem("talkingbi_mode", mode);
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  const userLabel = useMemo(() => {
    const email = session?.user?.email || "";
    const name = session?.user?.name || "";
    return name || email || "Profile";
  }, [session?.user?.email, session?.user?.name]);

  return (
    <header className="fixed left-0 right-0 top-0 z-[70] px-4 pt-3 md:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/65 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl md:px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-2 py-1">
          <Link href="/" className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
            Home
          </Link>
          <Link href="/dashboard?new=1" className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
            New Chat
          </Link>
          <Link href="/history" className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
            Chat History
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteIdx((prev) => (prev + 1) % PALETTES.length)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-black transition hover:scale-105"
            title="Next background color"
          >
            <Palette className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setPaletteIdx(0)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-black transition hover:scale-105"
            title="Reset color"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "light" ? "dark" : "light"))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-black transition hover:scale-105"
            title="Toggle theme"
          >
            {mode === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {!session?.user ? (
            <>
              <Link href="/login" className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm font-semibold text-black hover:bg-white">
                Login
              </Link>
              <Link href="/signup" className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Sign Up
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="max-w-[180px] truncate rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm font-semibold text-black">
                {userLabel}
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm font-semibold text-black hover:bg-white"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
