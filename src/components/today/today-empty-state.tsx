import React from "react";

interface TodayEmptyStateProps {
  message?: string;
}

export function TodayEmptyState({
  message = "You're all set for today. Enjoy the moment.",
}: TodayEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 h-64 max-w-xl mx-auto w-full"
      role="status"
    >
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
        <svg
          className="w-8 h-8 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-xl font-medium text-slate-700 mb-2">All Done</h2>
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
