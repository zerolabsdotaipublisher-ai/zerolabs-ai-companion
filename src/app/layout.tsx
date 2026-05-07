import type { Metadata } from "next";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: env.appName,
  description: "Base Next.js application for AI Companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
