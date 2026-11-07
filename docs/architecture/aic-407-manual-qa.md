# AIC-407 Manual QA Scenarios for Final Epic 4 Validation

## 1. Complete Suggestion-to-Timeline Daily Loop

- **Scenario A:** Navigate to `/today`. Accept a generated suggestion by clicking "Do it". Complete the capture form on `/capture` (with optional note/photo) and submit. Navigate to `/timeline`.
- **Expected:** The suggestion transitions from `pending` to `accepted`. The capture form submission automatically generates a 1-line memory summary. The new memory appears at the top of the `/timeline` (newest-first) and correctly associates with the accepted suggestion (showing context/suggestion pill visually).

## 2. Spontaneous Direct Capture Journey

- **Scenario B:** Navigate directly to `/capture` (without any active suggestion parameters). Complete the capture form and submit. Navigate to `/timeline`.
- **Expected:** The form submits successfully and generates an independent memory summary. The memory appears chronologically at the top of `/timeline` with a standard layout (no suggestion pill), confirming the dual origin model.

## 3. Memory Detail View & Edits

- **Scenario C:** On `/timeline`, tap into any memory to view `/timeline/[id]`. Edit the inline memory summary text.
- **Expected:** The detailed view shows full context (reflection notes, photo if present). Editing the memory text updates the `memories` table correctly. The UI reflects the new text immediately.

## 4. Immutable Source Preservation (Deletion)

- **Scenario D:** From the memory detail view (`/timeline/[id]`), delete the memory. Check the database `captures` table and Supabase Storage.
- **Expected:** The memory is removed from the timeline list (`memories` row deleted). Crucially, the underlying raw capture (`captures` row) and any associated photo file in Supabase Storage remain completely intact (immutable source preservation).

## 5. Keyset Cursor Pagination

- **Scenario E:** Ensure multiple memories exist. Scroll down to the bottom of the `/timeline` list.
- **Expected:** Pagination triggers correctly based on `(created_at, id)` deduplication. New items load and append smoothly. When all items are loaded (`hasMore === false`), the calm resting indicator ("You're all caught up with your memories.") is rendered.

## 6. AI Timeout & Deterministic Fallback

- **Scenario F:** Force an AI timeout or network failure (e.g., by revoking API keys locally) and submit a capture on `/capture`.
- **Expected:** The system does not crash or display a harsh error boundary. Instead, it handles the failure gracefully by persisting a deterministic, vibe-aligned fallback memory summary, maintaining the calm and supportive UX.

## 7. Responsive Mobile Layout

- **Scenario G:** View the `/timeline`, `/today`, and `/capture` screens on a mobile device or Chrome DevTools set to a 375px viewport.
- **Expected:** The layout scales correctly (`min-h-[dvh]`), touch targets are at least $44 \times 44$px, and there is zero horizontal scroll overflow.

## 8. Cross-Tenant Multi-User Isolation

- **Scenario H:** Log in as User A and create a memory. Log in as User B and attempt to view, edit, or delete User A's memory via direct URL modification or API tools.
- **Expected:** The system strictly rejects access. Supabase RLS policies (`auth.uid() = user_id`) enforce strict multi-tenant isolation across all tables (`daily_suggestions`, `captures`, `memories`, storage objects).

## 9. Architectural Hygiene

- **Scenario I:** Review the repository structure, `middleware.ts`, and network payloads.
- **Expected:** `src/middleware.ts` remains completely untouched. There are zero files located in the deprecated `docs/project-memory/` directory. Zero raw metadata (e.g., internal DB UUIDs, raw timestamps, storage bucket paths) leak into client view models or DOM elements. Private media renders exclusively via short-lived signed URLs.
