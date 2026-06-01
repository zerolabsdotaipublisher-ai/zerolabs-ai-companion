import { publicConfig } from "@/config/env";
import { getAuthenticatedUser } from "@/lib/auth/server";
import Link from "next/link";

export default async function Home() {
  const user = await getAuthenticatedUser();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">
        {publicConfig.appName}
      </h1>
      <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
        AI Companion uses Supabase Auth with App Router-safe session handling for public and protected
        experiences.
      </p>
      <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
        Session-aware navigation updates as auth changes, while server-side route protection remains
        authoritative for protected pages.
      </p>
      <div className="flex flex-wrap gap-3">
        {user ? (
          <>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              href="/dashboard"
            >
              Open dashboard
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              href="/profile"
            >
              View profile
            </Link>
          </>
        ) : (
          <>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              href="/signup"
            >
              Create account
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              href="/login"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
