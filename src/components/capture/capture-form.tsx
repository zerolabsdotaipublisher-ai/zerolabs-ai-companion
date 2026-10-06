"use client";

import React, { useState, FormEvent, KeyboardEvent } from "react";
import { CreateExperienceCaptureInput } from "@/lib/ai/types";

export interface CaptureFormProps {
  suggestionId?: string | null;
  onSubmit: (data: CreateExperienceCaptureInput) => Promise<void>;
  isSubmitting: boolean;
}

export function CaptureForm({
  suggestionId,
  onSubmit,
  isSubmitting,
}: CaptureFormProps) {
  const [noteText, setNoteText] = useState("");

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    await onSubmit({
      suggestionId: suggestionId || null,
      noteText: noteText.trim() || null,
      mediaMetadata: null, // Media upload not in MVP
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent premature submission when composing text via IME (e.g. Japanese, Chinese)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e.nativeEvent as any).isComposing) return;

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full">
      <div className="relative w-full">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          maxLength={1000}
          placeholder="Add a short note or reflection... (Optional)"
          className="w-full min-h-[120px] p-4 bg-white border border-neutral-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900/20 disabled:opacity-50 text-neutral-800 placeholder:text-neutral-400 text-[16px]"
          data-testid="capture-note-textarea"
        />
        <div
          className={`absolute bottom-3 right-4 text-xs ${noteText.length >= 1000 ? "text-red-500" : "text-neutral-400"}`}
        >
          {noteText.length}/1000
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-4 bg-neutral-900 text-white rounded-full font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
        data-testid="capture-submit-button"
      >
        {isSubmitting ? (
          <span className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></span>
          </span>
        ) : (
          "Done"
        )}
      </button>
    </form>
  );
}
