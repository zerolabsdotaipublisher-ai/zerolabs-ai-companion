import React, { useState } from "react";

interface TodayAlternativesProps {
  alternatives: string[];
  onSelectAlternative: (alternative: string) => void;
  isSubmitting?: boolean;
}

export function TodayAlternatives({
  alternatives,
  onSelectAlternative,
  isSubmitting = false,
}: TodayAlternativesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSubmitting}
        aria-expanded={isOpen}
        aria-controls="alternatives-list"
        className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-2"
      >
        {isOpen ? "Hide alternatives" : "Try another"}
      </button>

      {isOpen && (
        <div
          id="alternatives-list"
          className="mt-4 flex flex-col gap-3"
          role="region"
          aria-label="Alternative suggestions"
        >
          {alternatives.map((alt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSubmitting}
              onClick={() => onSelectAlternative(alt)}
              className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-800"
            >
              {alt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
