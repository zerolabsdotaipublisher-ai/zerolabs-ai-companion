import Link from "next/link";

import {
  buildSearchParamsString,
  type RouteSearchParams,
} from "@/lib/auth/session-persistence";
import { requireServerSession } from "@/lib/auth/server";
import { LogoutButton } from "@/components/auth/logout-button";

type DashboardPageProps = {
  searchParams?: Promise<RouteSearchParams>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { user } = await requireServerSession({
    pathname: "/dashboard",
    searchParams: buildSearchParamsString(resolvedSearchParams),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-6 px-6 py-20">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
          <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
            You are signed in to AI Companion.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as <span className="font-medium">{user.email ?? "your account"}</span>.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            href="/profile"
          >
            Profile
          </Link>
          <LogoutButton
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            idleLabel="Sign out"
            pendingLabel="Signing out..."
          />
        </div>
      </div>
    </main>
  );
}
