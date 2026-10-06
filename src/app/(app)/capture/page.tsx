"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CaptureHeader } from "@/components/capture/capture-header";
import { CaptureForm } from "@/components/capture/capture-form";
import { CaptureSaveState } from "@/components/capture/capture-save-state";
import { CreateExperienceCaptureInput } from "@/lib/ai/types";

function CapturePageContent() {
  const searchParams = useSearchParams();
  const suggestionId = searchParams.get("suggestionId");
  const suggestionContext = searchParams.get("suggestionContext");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateExperienceCaptureInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save capture");
      }

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Unable to save experience. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full px-6">
        <CaptureSaveState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-6 pt-12">
      <CaptureHeader suggestionContext={suggestionContext} />

      <div className="mt-8 flex-1">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        <CaptureForm
          suggestionId={suggestionId}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-neutral-50/50">
      <Suspense
        fallback={
          <div className="min-h-[100dvh] flex flex-col bg-neutral-50/50" />
        }
      >
        <CapturePageContent />
      </Suspense>
    </main>
  );
}
