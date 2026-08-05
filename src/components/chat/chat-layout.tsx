import { ReactNode } from "react";

type ChatLayoutProps = {
  children: ReactNode;
};

export function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-73px)] w-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
        {children}
      </div>
    </div>
  );
}