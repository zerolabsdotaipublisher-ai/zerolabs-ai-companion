1. **Update Validation Schema**:
   - Add `conversationId: z.string().nullable().optional()` to `ConversationInputSchema` in `src/lib/ai/validation.ts`.
2. **Update API Route (`route.ts`)**:
   - In `POST`, retrieve `conversationId` from parsed body.
   - If missing, use `createConversation` to create a new one.
   - Save the last user message using `saveUserMessage`.
   - Update the returned `Response` to include `x-conversation-id` and `Access-Control-Expose-Headers: x-conversation-id` in the headers.
   - Consolidate imports for `db-service.ts` at the top of the file.
3. **Update Tests (`tests/components/chat.test.tsx`)**:
   - Add an integration test simulating sending a message from a new chat (`conversationId = null`).
   - Mock fetch to return a `Response` with the `x-conversation-id` header.
   - Verify that the chat component captures the ID and triggers a reload of the conversation list (`GET /api/ai/conversation?list=true`).
4. **Complete Pre-commit Steps**:
   - Ensure proper testing, verification, review, and reflection are done (e.g. `npm run typecheck`, `npm run lint`, `npm test`, etc.).
5. **Submit**:
   - Submit the change with an appropriate branch name and commit message.
