"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientTimelineDetail } from "@/lib/ai/types";

interface TimelineDetailProps {
  memory: ClientTimelineDetail;
}

export function TimelineDetail({ memory }: TimelineDetailProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [summaryText, setSummaryText] = useState(memory.summaryText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = isSubmitting || isRegenerating || isDeleting;

  const handleSave = async () => {
    if (summaryText.length < 1 || summaryText.length > 280) {
      setError("Summary must be between 1 and 280 characters.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/memory/${memory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update memory.");
      }
      const data = await res.json();
      setSummaryText(data.memory.summaryText);
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/memory/${memory.id}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate memory.");
      }
      const data = await res.json();
      setSummaryText(data.memory.summaryText);
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this memory? The original capture will remain intact.",
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/memory/${memory.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete memory.");
      }
      router.push("/timeline");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col min-h-[100dvh]">
      <header className="px-4 py-3 flex items-center border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link
          href="/timeline"
          className="text-slate-500 hover:text-slate-800 text-sm font-medium mr-4 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>
        <h1 className="text-base font-semibold text-slate-900 truncate">
          Memory Detail
        </h1>
      </header>

      <div className="flex flex-col w-full bg-slate-50 flex-1 px-4 py-6 gap-6">
        <article className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {memory.photoUrl && (
            <div className="relative w-full h-64 sm:h-80 bg-slate-100">
              <Image
                src={memory.photoUrl}
                alt="Memory attachment"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}

          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                <time dateTime={memory.displayDate}>
                  {memory.displayDate} &middot; {memory.displayTime}
                </time>
                {memory.originType === "suggestion" &&
                  memory.suggestionTitle && (
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md max-w-[200px] truncate">
                      {memory.suggestionTitle}
                    </span>
                  )}
              </div>
            </div>

            {/* Read-Only View */}
            {!isEditing && (
              <div className="flex flex-col gap-4">
                <p className="text-slate-900 text-lg leading-relaxed font-medium">
                  {summaryText}
                </p>

                {memory.noteText && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                      Original Note
                    </p>
                    <p className="text-sm text-slate-700 italic">
                      &ldquo;{memory.noteText}&rdquo;
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={disabled}
                    className="flex-1 min-h-[44px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={disabled}
                    className="flex-1 min-h-[44px] bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isRegenerating ? "Generating..." : "Regenerate"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={disabled}
                    className="flex-1 min-h-[44px] bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}

            {/* Edit View */}
            {isEditing && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  className="w-full min-h-[100px] p-3 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-[15px] resize-none disabled:opacity-50 outline-none transition-shadow"
                  maxLength={280}
                  placeholder="Edit your memory..."
                  data-testid="memory-edit-textarea"
                />
                <div className="text-xs text-slate-400 text-right font-medium">
                  {summaryText.length} / 280
                </div>

                <div className="flex gap-2 mt-1 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSave}
                    disabled={disabled || summaryText.length === 0}
                    className="flex-1 min-h-[44px] bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setSummaryText(memory.summaryText);
                      setIsEditing(false);
                      setError(null);
                    }}
                    disabled={disabled}
                    className="flex-1 min-h-[44px] bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
