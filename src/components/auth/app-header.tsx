import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { publicConfig } from "@/config/env";

type AppHeaderProps = {
  isAuthenticated: boolean;
  userEmail: string | null;
};

export function AppHeader({ isAuthenticated, userEmail }: AppHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="space-y-1">
          <Link className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" href="/">
            {publicConfig.appName}
          </Link>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isAuthenticated
              ? `Signed in${userEmail ? ` as ${userEmail}` : ""}`
              : "Sign in to access your companion workspace."}
          </p>
        </div>

        {isAuthenticated ? (
          <nav aria-label="Authenticated navigation" className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              href="/profile"
            >
              Profile
            </Link>
            <LogoutButton
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              idleLabel="Sign out"
              pendingLabel="Signing out..."
            />
          </nav>
        ) : (
          <nav aria-label="Public navigation" className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              href="/signup"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
