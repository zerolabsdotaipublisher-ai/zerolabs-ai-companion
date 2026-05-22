import { LogoutButton } from "@/components/auth/logout-button";

export default function LogoutPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-10 text-center sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Signing you out…</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        If you are not redirected automatically, continue below.
      </p>
      <div className="flex justify-center">
        <LogoutButton
          autoSubmit
          className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          idleLabel="Continue"
          pendingLabel="Signing out..."
        />
      </div>
    </main>
  );
}
