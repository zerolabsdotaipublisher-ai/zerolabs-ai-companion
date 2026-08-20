1. **Update `src/lib/ai/db-service.ts`**:
   - Add `limit` and `offset` parameters to `getConversationMessages` to support chunked historical loading.
   - Example signature: `export async function getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<DbResult<Message[]>>`
   - Update the supabase query: `.range(offset || 0, (offset || 0) + (limit || 50) - 1)` or `.limit(limit).range(...)`.
   - Add a method to get user's conversations so we can know which conversation to load on mount. `getUserConversations(userId: string, limit?: number, offset?: number): Promise<DbResult<Conversation[]>>`

2. **Create GET handler in `src/app/api/ai/conversation/route.ts`**:
   - Handle GET requests to fetch messages for a `conversationId` provided via query params (`?conversationId=...`).
   - If `conversationId` is not provided, fetch the most recent conversation for the user, and then fetch its messages. Wait, it would be better to separate conversations and messages, or have an endpoint that just gives the latest thread and messages.
   - Alternatively, add an endpoint `GET /api/ai/conversation` that returns the latest conversation's messages along with its ID. Or maybe return `{ messages, conversationId }`.

3. **Update Client UI in `src/app/(app)/chat/page.tsx`**:
   - On component mount, use `useEffect` (or `SWR` / `react-query`, but standard fetch is fine) to call `GET /api/ai/conversation`.
   - If there is a latest conversation, hydrate `messages` and `conversationId`.
   - Ensure the loaded messages render chronologically (`created_at` ASC). Supabase handles this, but we should make sure the roles match `user` / `assistant` and they map correctly to `ConversationMessage`.
   - We need to handle pagination: maybe just load the latest N messages for now, or just limit to 50 on mount. (The task says "Pagination Preparedness: Ensure query utilities support pagination parameters (limit and offset)", it doesn't strictly say the UI must have a "Load More" button yet, just the backend preparedness).

4. **Tests in `tests/components/chat.test.tsx`**:
   - Expand tests to mock history fetches, verifying loading states, message hydration, and chronological rendering.
   - We'll mock the `global.fetch` inside `useEffect` on mount.

5. **Linting and Building**:
   - Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` to verify.

Let's refine the GET route:

```ts
export async function GET(request: Request): Promise<Response>;
```

Extract `conversationId`, `limit`, `offset` from `request.url`.
If `conversationId` is missing, we need to query `conversations` table for the most recent conversation for the user. We'll need a new function in `db-service.ts`: `getLatestConversation(userId: string): Promise<DbResult<Conversation | null>>`.
If no conversation, return `{ messages: [], conversationId: null }`.
If conversation exists, fetch messages using `getConversationMessages(conversationId, limit, offset)`.
Map messages to `ConversationMessage[]` format (role, content).
Return `{ messages, conversationId }`.
