import React from "react";

export function TodaySkeleton() {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4 animate-pulse w-full max-w-xl mx-auto"
      role="status"
      aria-label="Loading suggestion"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
        <div className="h-6 bg-slate-200 rounded-full w-12 shrink-0"></div>
      </div>

      <div className="flex gap-2 mt-2">
        <div className="h-5 bg-slate-200 rounded-full w-16"></div>
        <div className="h-5 bg-slate-200 rounded-full w-20"></div>
      </div>

      <div className="space-y-3 mt-4">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      </div>

      <div className="flex gap-3 mt-8">
        <div className="h-12 bg-slate-200 rounded-xl flex-1"></div>
        <div className="h-12 bg-slate-200 rounded-xl flex-[2]"></div>
      </div>
    </div>
  );
}
