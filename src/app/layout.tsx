import type { Metadata } from "next";
import { publicConfig } from "@/config/env";
import { WebVitalsReporter } from "@/components/monitoring/web-vitals-reporter";
import "./globals.css";

export const metadata: Metadata = {
  title: publicConfig.appName,
  description: "Base Next.js application for AI Companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
