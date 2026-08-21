import React from "react";
import { Database } from "@/types/database.types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export type ChatSidebarProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
};

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isLoading = false,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 sm:w-64">
      <div className="p-4">
        <button
          onClick={onNewChat}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        <h2 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
          Conversations
        </h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No previous conversations.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  disabled={isLoading}
                  className={`w-full text-left truncate rounded-md px-3 py-2 text-sm transition-colors ${
                    activeConversationId === conv.id
                      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {conv.title || "New Conversation"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
