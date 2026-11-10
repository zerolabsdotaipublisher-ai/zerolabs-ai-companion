import { Suspense } from "react";
import { getTimelineMemories } from "@/lib/ai/memory-db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TimelineList } from "@/components/timeline/timeline-list";
import { TimelineSkeleton } from "@/components/timeline/timeline-skeleton";
import { TimelineError } from "@/components/timeline/timeline-error";
import { AppHeader } from "@/components/auth/app-header";
import { logger } from "@/lib/logger";

async function TimelineData() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please sign in to view your timeline.
      </div>
    );
  }

  let timelineResponse: import("@/lib/ai/types").TimelineResponse | null = null;
  try {
    timelineResponse = await getTimelineMemories(user.id, { limit: 10 });
  } catch (error) {
    logger.error("Failed to load timeline data", { error });
    return <TimelineError />;
  }
  return <TimelineList initialData={timelineResponse!} />;
}

export default async function TimelinePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 w-full overflow-x-hidden">
      <AppHeader isAuthenticated={!!user} userEmail={user?.email ?? null} />

      <main className="flex-1 w-full pb-20">
        <Suspense fallback={<TimelineSkeleton />}>
          <TimelineData />
        </Suspense>
      </main>
    </div>
  );
}
