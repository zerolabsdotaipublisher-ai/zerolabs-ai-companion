"use client";

import { ClientTimelineItem } from "@/lib/ai/types";
import { TimelineCard } from "./timeline-card";
import { TimelineEmptyState } from "./timeline-empty-state";

interface TimelineListProps {
  memories: ClientTimelineItem[];
}

export function TimelineList({ memories }: TimelineListProps) {
  if (memories.length === 0) {
    return <TimelineEmptyState />;
  }

  return (
    <div className="flex flex-col space-y-6 max-w-xl mx-auto px-4 py-8">
      {memories.map((memory) => (
        <TimelineCard key={memory.id} item={memory} />
      ))}

      {memories.length > 0 && (
        <div className="pt-8 pb-12 flex justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        </div>
      )}
    </div>
  );
}
