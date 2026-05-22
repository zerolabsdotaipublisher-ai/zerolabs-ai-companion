import { redirect } from "next/navigation";

import { AUTH_ENTRY_REDIRECT } from "@/lib/auth/redirects";
import { buildAuthEntryRedirectPath } from "@/lib/auth/session-persistence";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildAuthEntryRedirectPath("/dashboard", "", AUTH_ENTRY_REDIRECT));
  }

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
        <form action="/auth/logout" method="post">
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
