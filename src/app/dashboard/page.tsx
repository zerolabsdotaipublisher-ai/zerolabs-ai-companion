import {
  buildSearchParamsString,
  type RouteSearchParams,
} from "@/lib/auth/session-persistence";
import { requireServerSession } from "@/lib/auth/server";

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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-6 py-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
          You are signed in to AI Companion.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as <span className="font-medium">{user.email ?? "your account"}</span>.
        </p>
      </div>
    </main>
  );
}
