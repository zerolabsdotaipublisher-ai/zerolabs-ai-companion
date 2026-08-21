"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { SendButton } from "@/components/chat/send-button";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ConversationMessage } from "@/lib/ai/types";
import { Database } from "@/types/database.types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export default function ChatPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversation?list=true");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load conversations list", err);
    }
  }, []);

  const loadConversationMessages = useCallback(async (id: string | null) => {
    if (!id) {
      setMessages([]);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ai/conversation?conversationId=${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch conversation history");
      }
      const data = await res.json();
      setConversationId(id);
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch {
      setError("Failed to load conversation history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/ai/conversation");
        if (!res.ok) {
          throw new Error("Failed to fetch conversation history");
        }
        const data = await res.json();

        if (isMounted) {
          const loadedConvId =
            data.conversationId !== undefined ? data.conversationId : null;
          setConversationId(loadedConvId);
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages);
          } else {
            setMessages([]);
          }
          await loadConversations();
        }
      } catch {
        if (isMounted) {
          setError("Failed to load conversation history. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      isMounted = false;
    };
  }, [loadConversations]);

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    handleStop();
    setConversationId(null);
    setMessages([]);
    setError(null);
  };

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return;
    handleStop();
    setError(null);
    loadConversationMessages(id);
  };

  const dispatchRequest = async (updatedMessages: ConversationMessage[]) => {
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          ...(conversationId && { conversationId }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(
            `Failed to get response: ${response.status} ${response.statusText}`,
          );
        }
        if (errorData && errorData.error) {
          throw new Error(errorData.message || "An error occurred");
        }
        throw new Error(
          `Failed to get response: ${response.status} ${response.statusText}`,
        );
      }

      if (!response.body) {
        throw new Error("Response body is not readable.");
      }

      setIsLoading(false);
      setIsStreaming(true);

      const reader = response.body.getReader();
      const responseConversationId = response.headers.get("x-conversation-id");
      if (responseConversationId && responseConversationId !== conversationId) {
        setConversationId(responseConversationId);
        // Refresh conversations list to show the newly created chat
        loadConversations();
      }
      const decoder = new TextDecoder();
      let done = false;
      let assistantMessageContent = "";

      // Append an empty assistant message to update it progressively
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split("\n");

          // Keep the last partial line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const dataString = trimmedLine.slice("data: ".length);
              if (dataString === "[DONE]") {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataString);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessageContent += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === "assistant") {
                      lastMessage.content = assistantMessageContent;
                    }
                    return newMessages;
                  });
                }
              } catch {
                // Ignore parsing errors for incomplete JSON chunks that might arrive broken
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          // Stream was cancelled, this is normal
          return;
        }
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || isStreaming) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: trimmedInput,
    };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");

    await dispatchRequest(updatedMessages);
  };

  const handleRetry = async () => {
    if (isLoading || isStreaming) return;

    // Remove any incomplete assistant message from the end
    const cleanedMessages = [...messages];
    if (
      cleanedMessages.length > 0 &&
      cleanedMessages[cleanedMessages.length - 1].role === "assistant"
    ) {
      cleanedMessages.pop();
      setMessages(cleanedMessages);
    }

    await dispatchRequest(cleanedMessages);
  };

  return (
    <ChatLayout
      sidebar={
        <ChatSidebar
          conversations={conversations}
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          isLoading={isLoading}
        />
      }
    >
      <ChatMessageList messages={messages} isLoading={isLoading} />

      <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-900/50 dark:text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-900 hover:bg-red-200 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading || isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Stop message
            </button>
          ) : (
            <SendButton
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
            />
          )}
        </div>
      </div>
    </ChatLayout>
  );
}
