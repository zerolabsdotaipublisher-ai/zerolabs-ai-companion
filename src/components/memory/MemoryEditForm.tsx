"use client";

import React, { useState } from "react";

export interface MemoryEditFormProps {
  memoryId: string;
  initialSummaryText: string;
  captureContext?: {
    noteText?: string | null;
    mediaUrl?: string | null;
    suggestionTitle?: string | null;
  };
  onUpdated?: (newSummary: string) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
}

export function MemoryEditForm({
  memoryId,
  initialSummaryText,
  captureContext,
  onUpdated,
  onDeleted,
  onCancel,
}: MemoryEditFormProps) {
  const [summaryText, setSummaryText] = useState(initialSummaryText);
  const [isEditing, setIsEditing] = useState(false);
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
      const res = await fetch(`/api/memory/${memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update memory.");
      }
      const data = await res.json();
      setIsEditing(false);
      onUpdated?.(data.memory.summaryText);
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
      const res = await fetch(`/api/memory/${memoryId}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate memory.");
      }
      const data = await res.json();
      setSummaryText(data.memory.summaryText);
      setIsEditing(false);
      onUpdated?.(data.memory.summaryText);
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
      const res = await fetch(`/api/memory/${memoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete memory.");
      }
      onDeleted?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Avoid triggering forms internally if nested
    if (e.nativeEvent.isComposing) return;
  };

  return (
    <div className="w-full max-w-[375px] mx-auto flex flex-col gap-4 p-4 border rounded shadow-sm bg-white">
      {/* Read-Only View */}
      {!isEditing && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-900">{summaryText}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="flex-1 min-h-[44px] bg-blue-50 text-blue-700 rounded text-sm font-medium disabled:opacity-50"
            >
              Edit
            </button>
            <button
              onClick={handleRegenerate}
              disabled={disabled}
              className="flex-1 min-h-[44px] bg-gray-100 text-gray-700 rounded text-sm font-medium disabled:opacity-50"
            >
              {isRegenerating ? "Generating..." : "Regenerate"}
            </button>
            <button
              onClick={handleDelete}
              disabled={disabled}
              className="flex-1 min-h-[44px] bg-red-50 text-red-700 rounded text-sm font-medium disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Edit View */}
      {isEditing && (
        <div className="flex flex-col gap-2">
          <textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full min-h-[88px] p-2 border rounded text-sm resize-none disabled:opacity-50"
            maxLength={280}
            placeholder="Edit your memory..."
            data-testid="memory-edit-textarea"
          />
          <div className="text-xs text-gray-500 text-right">
            {summaryText.length} / 280
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={disabled || summaryText.length === 0}
              className="flex-1 min-h-[44px] bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setSummaryText(initialSummaryText);
                setIsEditing(false);
                setError(null);
                onCancel?.();
              }}
              disabled={disabled}
              className="flex-1 min-h-[44px] bg-gray-200 text-gray-800 rounded text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-xs p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      {/* Context info if any */}
      {captureContext && (
        <div className="mt-4 pt-4 border-t text-xs text-gray-500 flex flex-col gap-1">
          <p className="font-semibold mb-1">Source Context</p>
          {captureContext.suggestionTitle && (
            <p>Activity: {captureContext.suggestionTitle}</p>
          )}
          {captureContext.noteText && (
            <p className="truncate">Note: {captureContext.noteText}</p>
          )}
          {captureContext.mediaUrl && (
            <div className="w-full h-32 mt-2 relative rounded overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captureContext.mediaUrl}
                alt="Capture"
                className="object-cover w-full h-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
