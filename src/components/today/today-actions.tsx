import React from "react";

interface TodayActionsProps {
  onAccept: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

export function TodayActions({
  onAccept,
  onSkip,
  isSubmitting = false,
}: TodayActionsProps) {
  return (
    <div className="flex items-center gap-3 mt-6 w-full">
      <button
        type="button"
        onClick={onSkip}
        disabled={isSubmitting}
        className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center h-12"
      >
        Skip
      </button>
      <button
        type="button"
        onClick={onAccept}
        disabled={isSubmitting}
        className="flex-[2] bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center h-12 shadow-sm"
      >
        Do it
      </button>
    </div>
  );
}
