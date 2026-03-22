import type { Metadata } from "next";

import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Talking BI",
  description: "Build interactive dashboards with KPI queries and personalized BI chatbot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
