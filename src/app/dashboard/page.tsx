import { redirect } from "next/navigation";

import { AUTH_ENTRY_REDIRECT } from "@/lib/auth/redirects";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${AUTH_ENTRY_REDIRECT}?next=%2Fdashboard`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-6 px-6 py-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
          You are signed in to AI Companion.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as <span className="font-medium">{user?.email ?? "your account"}</span>.
        </p>
      </div>
    </main>
  );
}
