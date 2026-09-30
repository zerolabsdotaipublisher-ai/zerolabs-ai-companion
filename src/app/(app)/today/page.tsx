"use client";

import React, { useState, useEffect } from "react";
import { TodaySuggestionCard } from "@/components/today/today-suggestion-card";
import { TodayAlternatives } from "@/components/today/today-alternatives";
import { TodayActions } from "@/components/today/today-actions";
import { TodaySkeleton } from "@/components/today/today-skeleton";
import { TodayEmptyState } from "@/components/today/today-empty-state";
import { TodayRefinement } from "@/components/today/today-refinement";
import type { ClientDailySuggestion } from "@/lib/ai/types";

export default function TodayPage() {
  const [suggestion, setSuggestion] = useState<ClientDailySuggestion | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // For Task 2.2, we just render the UI.
    // The server actions and DB fetch will be wired up in Task 2.3.
    // We mock a delay and empty state or simple suggestion to make the UI testable
    // and visually verifiable for now without crashing, or we can fetch a dummy endpoint.
    // Let's create a stub since we are building the UI.
    const loadMock = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 1000));

      // Simulate getting a pending suggestion
      setSuggestion({
        id: "mock-id-123",
        primarySuggestion: "Take a 15-minute walk without your phone",
        supportingContext:
          "You've been indoors most of the morning. A quick screen-free walk will clear your head and fits the spontaneous vibe.",
        alternatives: [
          "Stretch by the window for 5 minutes.",
          "Make a fresh cup of tea and focus on the brewing process.",
        ],
        estimatedDuration: "15m",
        categoryTags: ["outdoor", "mindful", "screen-free"],
        status: "pending",
      });
      setIsLoading(false);
    };

    loadMock();
  }, []);

  const updateStatus = async (status: string, alternativeText?: string) => {
    if (!suggestion) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/daily-suggestion/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setSuggestion((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: status as ClientDailySuggestion["status"],
          ...(alternativeText
            ? {
                primarySuggestion: alternativeText,
                estimatedDuration: null,
                categoryTags: [],
                supportingContext: "Alternative suggestion selected.",
              }
            : {}),
        };
      });
    } catch (_err) {
      setError("Failed to update suggestion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = () => updateStatus("accepted");
  const handleSkip = () => updateStatus("skipped");
  const handleAlternative = (alt: string) => {
    // When clicking an alternative, update the active suggestion primary text immediately.
    setSuggestion((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        primarySuggestion: alt,
        estimatedDuration: null,
        categoryTags: [],
        supportingContext: "Alternative suggestion selected.",
      };
    });
    // We update the DB via updateStatus which also persists the choice locally.
    updateStatus("alternative_requested", alt);
  };

  const handleAdoptRefinement = (text: string) => {
    // Update local suggestion primary text without immediate DB save, let the user click "Do it"
    setSuggestion((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        primarySuggestion: text,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl mx-auto">
          <TodaySkeleton />
        </div>
      </div>
    );
  }

  if (
    !suggestion ||
    suggestion.status === "accepted" ||
    suggestion.status === "skipped"
  ) {
    return (
      <div className="flex-1 w-full h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <TodayEmptyState />
      </div>
    );
  }

  const suggestionContext = suggestion
    ? {
        primarySuggestion: suggestion.primarySuggestion,
        supportingContext: suggestion.supportingContext,
        estimatedDuration: suggestion.estimatedDuration ?? undefined,
        categoryTags: suggestion.categoryTags,
      }
    : undefined;

  return (
    <div className="flex-1 w-full h-[100dvh] bg-slate-50 flex flex-col pt-12 md:pt-24 px-4 overflow-y-auto">
      <div className="w-full max-w-xl mx-auto flex flex-col gap-4 pb-12">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 w-full max-w-xl mx-auto mb-2">
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
        <TodaySuggestionCard
          title={suggestion.primarySuggestion}
          duration={
            suggestion.estimatedDuration as "15m" | "30m" | "1h" | "flex" | null
          }
          tags={suggestion.categoryTags}
          rationale={suggestion.supportingContext}
        />
        {suggestionContext && (
          <TodayRefinement
            suggestionContext={suggestionContext}
            onStreamingChange={setIsStreaming}
            disabled={isSubmitting}
            onAdopt={handleAdoptRefinement}
          />
        )}
        <TodayActions
          onAccept={handleAccept}
          onSkip={handleSkip}
          isSubmitting={isSubmitting || isStreaming}
        />
        <TodayAlternatives
          alternatives={suggestion.alternatives}
          onSelectAlternative={handleAlternative}
          isSubmitting={isSubmitting || isStreaming}
        />
      </div>
    </div>
  );
}
