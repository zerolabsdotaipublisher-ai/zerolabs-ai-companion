export default function ProfileLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
      <div className="space-y-3">
        <div className="h-10 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <div className="h-5 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-11 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-11 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-11 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-11 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-11 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </section>
    </main>
  );
}
