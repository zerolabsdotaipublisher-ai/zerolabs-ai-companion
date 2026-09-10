"use client";

import { ReactNode, useState } from "react";

type ChatLayoutProps = {
  children: ReactNode;
  sidebar?: ReactNode;
};

export function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-73px)] w-full flex-row bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebar && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      {sidebar && (
        <div
          className={`absolute inset-y-0 left-0 z-50 transform border-r border-zinc-200 bg-zinc-50 transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 sm:relative sm:translate-x-0 ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile Close Button */}
          <div className="absolute right-2 top-2 sm:hidden">
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span className="sr-only">Close sidebar</span>
            </button>
          </div>
          {sidebar}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex h-full w-full flex-col min-w-0">
        <div className="flex h-12 items-center border-b border-zinc-200 px-4 dark:border-zinc-800 sm:hidden">
          {sidebar && (
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="mr-2 p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span className="sr-only">Open sidebar</span>
            </button>
          )}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            AI Companion
          </span>
        </div>
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
