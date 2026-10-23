"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TimelineError() {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    router.refresh();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 mt-12 bg-red-50 rounded-2xl max-w-xl mx-auto border border-red-100">
      <p className="text-red-800 text-sm font-medium mb-3">
        We couldn&apos;t load your timeline right now.
      </p>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="px-4 py-2 bg-white text-red-700 text-sm font-medium rounded-lg border border-red-200 shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {isRetrying ? "Retrying..." : "Try Again"}
      </button>
    </div>
  );
}
