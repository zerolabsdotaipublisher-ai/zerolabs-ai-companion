import React from "react";
import Link from "next/link";

export function CaptureSaveState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-500"
          fill="none"
          strokeWidth="2.5"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-medium text-neutral-900 tracking-tight">
          Experience recorded
        </h2>
        <p className="text-neutral-500">
          Your moment has been safely captured.
        </p>
      </div>
      <Link
        href="/today"
        className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full font-medium transition-colors"
      >
        Return to Today
      </Link>
    </div>
  );
}
