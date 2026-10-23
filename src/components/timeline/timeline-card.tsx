import Image from "next/image";
import { ClientTimelineItem } from "@/lib/ai/types";

interface TimelineCardProps {
  item: ClientTimelineItem;
}

export function TimelineCard({ item }: TimelineCardProps) {
  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
      {item.photoUrl && (
        <div className="relative w-full h-48 sm:h-64 bg-slate-100">
          <Image
            src={item.photoUrl}
            alt="Memory attachment"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-5 flex flex-col space-y-3">
        <div className="flex justify-between items-center text-xs font-medium text-slate-400">
          <time dateTime={item.displayDate}>
            {item.displayDate} &middot; {item.displayTime}
          </time>
          {item.originType === "suggestion" && item.suggestionTitle && (
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md max-w-[120px] sm:max-w-[200px] truncate">
              {item.suggestionTitle}
            </span>
          )}
        </div>
        <p className="text-slate-800 leading-relaxed text-[15px]">
          {item.summaryText}
        </p>
      </div>
    </article>
  );
}
