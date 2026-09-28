import React from "react";

interface TodaySuggestionCardProps {
  title: string;
  duration?: "15m" | "30m" | "1h" | "flex" | null;
  tags?: string[];
  rationale: string;
}

export function TodaySuggestionCard({
  title,
  duration,
  tags = [],
  rationale,
}: TodaySuggestionCardProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4"
      role="article"
      aria-label="Today's Suggestion"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
          {title}
        </h2>
        {duration && (
          <span className="shrink-0 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
            {duration}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Categories">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-slate-600 leading-relaxed text-base">{rationale}</p>
    </div>
  );
}
