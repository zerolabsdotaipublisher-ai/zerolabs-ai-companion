import { notFound } from "next/navigation";
import { getTimelineMemoryDetail } from "@/lib/ai/memory-db";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { TimelineDetail } from "@/components/timeline/timeline-detail";
import { logger } from "@/lib/logger";

interface MemoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MemoryDetailPage({
  params,
}: MemoryDetailPageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    notFound();
  }

  const { id } = await params;

  let memoryDetail;
  try {
    memoryDetail = await getTimelineMemoryDetail(user.id, id);
  } catch (error) {
    logger.error(`Failed to load memory detail page for id ${id}`, {
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }

  if (!memoryDetail) {
    notFound();
  }

  return (
    <main className="bg-slate-50 min-h-[100dvh] w-full">
      <TimelineDetail memory={memoryDetail} />
    </main>
  );
}
