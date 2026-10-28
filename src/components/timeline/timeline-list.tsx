"use client";

import { useState } from "react";
import { TimelineResponse, ClientTimelineItem } from "@/lib/ai/types";
import { TimelineCard } from "./timeline-card";
import { TimelineEmptyState } from "./timeline-empty-state";
import { TimelineSkeleton } from "./timeline-skeleton";

interface TimelineListProps {
  initialData: TimelineResponse;
}

export function TimelineList({ initialData }: TimelineListProps) {
  const [items, setItems] = useState<ClientTimelineItem[]>(initialData.items);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialData.nextCursor,
  );
  const [hasMore, setHasMore] = useState<boolean>(initialData.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/timeline?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load more memories");
      }

      const data: TimelineResponse = await response.json();

      setItems((prevItems) => {
        // Deduplicate items based on id
        const existingIds = new Set(prevItems.map((item) => item.id));
        const newItems = data.items.filter((item) => !existingIds.has(item.id));
        return [...prevItems, ...newItems];
      });
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (items.length === 0 && !isLoadingMore && !error) {
    return <TimelineEmptyState />;
  }

  return (
    <div className="flex flex-col space-y-6 max-w-xl mx-auto px-4 py-8">
      {items.map((memory) => (
        <TimelineCard key={memory.id} item={memory} />
      ))}

      {isLoadingMore && <TimelineSkeleton />}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-center text-sm border border-red-100">
          <p className="mb-2">{error}</p>
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 bg-white text-red-700 rounded-lg border border-red-200 hover:bg-red-50 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {hasMore && !error && (
        <div className="pt-4 pb-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load More
          </button>
        </div>
      )}

      {!isLoadingMore && !hasMore && items.length > 0 && !error && (
        <div className="pt-8 pb-12 flex justify-center">
          <p className="text-slate-400 text-sm font-medium">
            You&apos;re all caught up with your memories.
          </p>
        </div>
      )}
    </div>
  );
}
