export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-6 px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">AI Companion</h1>
      <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
        Next.js base application initialized with TypeScript and App Router.
      </p>
      <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
        Platform integrations (Supabase, OpenAI, Qdrant, payments, auth, storage, and ZeroFlow services)
        are intentionally deferred to later tasks.
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Start building features in <code className="font-mono">src/</code>.
      </p>
    </main>
  );
}
