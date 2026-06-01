import type { Metadata } from "next";
import { AppHeader } from "@/components/auth/app-header";
import { AuthStateListener } from "@/components/auth/auth-state-listener";
import { publicConfig } from "@/config/env";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { WebVitalsReporter } from "@/components/monitoring/web-vitals-reporter";
import "./globals.css";

export const metadata: Metadata = {
  title: publicConfig.appName,
  description: "Base Next.js application for AI Companion.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();
  const isAuthenticated = user !== null;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-screen flex-col">
        <WebVitalsReporter />
        <AuthStateListener isAuthenticated={isAuthenticated} />
        <AppHeader isAuthenticated={isAuthenticated} userEmail={user?.email ?? null} />
        {children}
      </body>
    </html>
  );
}
