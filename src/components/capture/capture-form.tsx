"use client";

import React, { useState, FormEvent, KeyboardEvent, useRef } from "react";
import { CreateExperienceCaptureInput, MediaMetadata } from "@/lib/ai/types";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Unsupported file type. Allowed types are: image/jpeg, image/png, image/webp.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || isUploading) return;

    let mediaMetadata: MediaMetadata | null = null;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("captureId", crypto.randomUUID()); // Use a temporary UUID for upload, will be tied to capture eventually or just loosely associated

        const response = await fetch("/api/capture/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const data = await response.json();
        mediaMetadata = data.mediaMetadata;
      } catch (err) {
        console.error("Upload failed", err);
        setError("Failed to save experience. Please try again.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    await onSubmit({
      suggestionId: suggestionId || null,
      noteText: noteText.trim() || null,
      mediaMetadata,
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
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      {previewUrl ? (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-neutral-100 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            data-testid="capture-photo-preview"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white text-neutral-900 rounded-full font-medium text-sm hover:bg-neutral-100"
              disabled={isSubmitting || isUploading}
              data-testid="capture-replace-photo-button"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="px-4 py-2 bg-red-500 text-white rounded-full font-medium text-sm hover:bg-red-600"
              disabled={isSubmitting || isUploading}
              data-testid="capture-remove-photo-button"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center space-y-2"
          disabled={isSubmitting || isUploading}
        >
          <svg
            className="w-6 h-6 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium">Add a photo (optional)</span>
        </button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
        data-testid="capture-photo-input"
      />

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
        disabled={isSubmitting || isUploading}
        className="w-full py-3.5 px-4 bg-neutral-900 text-white rounded-full font-medium active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
        data-testid="capture-submit-button"
      >
        {isSubmitting || isUploading ? (
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
