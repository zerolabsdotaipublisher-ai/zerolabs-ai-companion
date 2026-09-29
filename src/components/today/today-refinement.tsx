"use client";

import React, { useState, useRef, useEffect } from "react";
import { SuggestionContext, ConversationMessage } from "@/lib/ai/types";

interface TodayRefinementProps {
  suggestionContext: SuggestionContext;
  onStreamingChange: (isStreaming: boolean) => void;
  disabled?: boolean;
}

const PREDEFINED_PILLS = [
  "Something indoors instead?",
  "Give me something that takes 30 minutes",
  "Tell me more about this",
];

export function TodayRefinement({
  suggestionContext,
  onStreamingChange,
  disabled = false,
}: TodayRefinementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onStreamingChange(isStreaming);
  }, [isStreaming, onStreamingChange]);

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const submitRefinement = async (text: string) => {
    if (!text.trim() || isStreaming || disabled) return;

    setError(null);
    setIsStreaming(true);

    const userMessage: ConversationMessage = { role: "user", content: text };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInputValue("");

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: currentMessages,
          suggestionContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to send refinement");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("data: ")) {
            const dataString = trimmedLine.slice("data: ".length);
            if (dataString === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataString);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  let lastMsg = newMsgs[newMsgs.length - 1];
                  if (lastMsg && lastMsg.role === "assistant") {
                    lastMsg = { ...lastMsg, content: lastMsg.content + content };
                    newMsgs[newMsgs.length - 1] = lastMsg;
                  }
                  return newMsgs;
                });
              }
            } catch {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Stream aborted");
      } else {
        setError("Failed to generate response. Please try again.");
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitRefinement(inputValue);
    }
  };

  if (!isOpen) {
    return (
      <div className="w-full mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-2"
        >
          Ask companion about this
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-4 flex flex-col gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-slate-700">
          Refine Suggestion
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-700 p-1"
          disabled={isStreaming || disabled}
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl text-sm ${
              msg.role === "user"
                ? "bg-slate-100 text-slate-800 self-end max-w-[85%]"
                : "bg-indigo-50 text-indigo-900 self-start max-w-[85%]"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => submitRefinement(pill)}
              disabled={isStreaming || disabled}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center mt-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || disabled}
          placeholder="Type your question..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            onClick={stopStream}
            className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Stop generating"
          >
            <div className="w-3 h-3 bg-slate-500 rounded-sm" />
          </button>
        ) : (
          <button
            onClick={() => submitRefinement(inputValue)}
            disabled={!inputValue.trim() || disabled}
            className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
