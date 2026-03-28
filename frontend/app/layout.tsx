import type { Metadata } from "next";

import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Talking BI",
  description: "Build interactive dashboards with KPI queries and personalized BI chatbot.",
};

const themeBootstrapScript = `
(() => {
  try {
    const root = document.documentElement;
    const path = window.location.pathname || "/";
    const isDashboardPage = path.startsWith('/dashboard');

    const defaultBg = '#f8f9fb';
    const defaultFg = '#0f172a';
    const darkBg = 'linear-gradient(180deg,#020617 0%,#0f172a 55%,#111827 100%)';
    const darkFg = '#f8fafc';

    if (!isDashboardPage) {
      root.removeAttribute('data-mode');
      root.style.setProperty('--page-bg', defaultBg);
      root.style.setProperty('--page-fg', defaultFg);
      return;
    }

    const mode = localStorage.getItem('talkingbi_mode');
    const paletteIdxRaw = Number(localStorage.getItem('talkingbi_palette_idx') || '0');
    const palettes = [
      { bg: '#f8f9fb', fg: '#0f172a' },
      { bg: 'linear-gradient(125deg,#ffe4e6 0%,#fce7f3 45%,#fff1f2 100%)', fg: '#1f2937' },
      { bg: 'linear-gradient(125deg,#fee2e2 0%,#ffedd5 50%,#fff7ed 100%)', fg: '#1f2937' },
      { bg: 'linear-gradient(125deg,#dcfce7 0%,#d1fae5 48%,#ecfdf5 100%)', fg: '#0f172a' },
      { bg: 'linear-gradient(125deg,#dbeafe 0%,#e0e7ff 45%,#eff6ff 100%)', fg: '#0f172a' },
      { bg: 'linear-gradient(125deg,#ede9fe 0%,#f5d0fe 45%,#faf5ff 100%)', fg: '#1f2937' },
      { bg: 'linear-gradient(125deg,#ecfeff 0%,#cffafe 48%,#f0fdfa 100%)', fg: '#0f172a' },
      { bg: 'linear-gradient(125deg,#e0f2fe 0%,#bae6fd 45%,#f0f9ff 100%)', fg: '#0f172a' },
      { bg: 'linear-gradient(125deg,#fef3c7 0%,#fde68a 45%,#fffbeb 100%)', fg: '#1f2937' },
      { bg: 'linear-gradient(125deg,#f0abfc 0%,#e9d5ff 45%,#fdf4ff 100%)', fg: '#1f2937' },
    ];

    if (mode === 'dark') {
      root.setAttribute('data-mode', 'dark');
      root.style.setProperty('--page-bg', darkBg);
      root.style.setProperty('--page-fg', darkFg);
      return;
    }

    root.setAttribute('data-mode', 'light');
    const safeIdx = Number.isFinite(paletteIdxRaw) ? Math.max(0, Math.min(palettes.length - 1, paletteIdxRaw)) : 0;
    root.style.setProperty('--page-bg', palettes[safeIdx].bg);
    root.style.setProperty('--page-fg', palettes[safeIdx].fg);
  } catch {
    // Keep rendering resilient even if localStorage is unavailable.
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
