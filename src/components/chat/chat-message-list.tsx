import { ConversationMessage } from "@/lib/ai/types";
import { useEffect, useRef } from "react";

type ChatMessageListProps = {
  messages: ConversationMessage[];
  isLoading?: boolean;
};

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (!containerRef.current || !bottomRef.current) return;

    const container = containerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 150;
    const isNewMessage = messages.length > prevMessagesLength.current;

    if (isNearBottom || isNewMessage || messages.length <= 1) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }

    prevMessagesLength.current = messages.length;
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Start a conversation with your AI Companion.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.map((message, i) => {
        const isUser = message.role === "user";
        // Ignore system messages from UI
        if (message.role === "system") return null;

        return (
          <div
            key={i}
            className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm sm:max-w-[75%] sm:text-base ${
                isUser
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 rounded-br-none"
                  : "bg-white text-zinc-900 border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex w-full justify-start">
          <div className="max-w-[85%] rounded-2xl px-5 py-3 text-sm sm:max-w-[75%] sm:text-base bg-white text-zinc-900 border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 rounded-bl-none">
            <div className="flex space-x-1.5 items-center h-6">
              <div
                className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
