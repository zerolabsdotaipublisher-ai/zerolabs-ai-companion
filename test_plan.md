Let's add `getLatestConversation(userId: string)` in `db-service.ts` so the client can load the latest thread on mount if they have one.
Wait, what if they pass `conversationId` in the URL, e.g. `/chat?id=...`?
Let's check `src/app/(app)/chat/page.tsx` for search params.
