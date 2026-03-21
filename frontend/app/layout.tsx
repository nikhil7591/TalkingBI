import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Talking BI",
  description: "Build interactive dashboards with KPI queries and personalized BI chatbot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
