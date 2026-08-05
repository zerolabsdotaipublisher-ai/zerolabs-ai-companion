"use client";

import { useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { SendButton } from "@/components/chat/send-button";
import { ConversationMessage, ConversationError } from "@/lib/ai/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setError(null);
    const userMessage: ConversationMessage = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ConversationError;
        if (errorData.error) {
          throw new Error(errorData.message || "An error occurred");
        }
        throw new Error("Failed to get response");
      }

      if (data && data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
         throw new Error("Invalid response format");
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
      // Revert optimistic update on failure, optional, but good for UX. Let's keep the user msg but show error below it
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatLayout>
      <ChatMessageList messages={messages} isLoading={isLoading} />

      <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-900/50 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="flex items-end gap-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading}
          />
          <SendButton
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
          />
        </div>
      </div>
    </ChatLayout>
  );
}