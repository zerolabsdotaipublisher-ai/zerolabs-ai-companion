# AIC-406 Manual QA Scenarios for Timeline Verification

## 1. Context and View Mode

- **Scenario A (Chronological list):** Navigate to the `/timeline` screen.
- **Expected:** The list displays generated memories in newest-first order (`created_at DESC`). The 1-line memory summary and the formatted date are clearly visible.

- **Scenario B (Visual evidence):** Verify rendering on `/timeline` for memories with and without photo attachments.
- **Expected:** Memories with photos show them via short-lived signed URLs properly. Memories without photos should fall back cleanly to a text-only card layout without broken image placeholders.

- **Scenario C (Dual origin):** Inspect a memory generated from a direct capture (no suggestion linked) vs one generated from a suggestion capture.
- **Expected:** Direct captures should look standard, while suggestion-linked memories should cleanly show the linked context/suggestion pill visually.

- **Scenario D (Pagination):** Scroll down to the bottom of the timeline list to trigger keyset cursor pagination.
- **Expected:** The UI locks state while loading more items (e.g. skeleton). When items load, they should append chronologically, handle ID deduplication, and when `hasMore === false`, the quiet resting state ("You're all caught up with your memories.") should render.

## 2. Detail View and Edits

- **Scenario E (Detail Navigation):** Tap into a specific memory on `/timeline`.
- **Expected:** Navigation to `/timeline/[id]` completes. The detailed view fully expands the raw capture reflection notes and full context.

- **Scenario F (Source Preservation on actions):** On the memory detail view, edit the text (up to 280 chars), click "Regenerate" to run the AI summary regeneration, and click "Delete". Check the underlying `/api/capture/history` or database entries.
- **Expected:** Editing, regenerating, and deleting the memory Modifies/Deletes ONLY the `memories` row while leaving the `captures` row and any associated photo file perfectly intact in the database and storage. 1-tap delete confirmation works smoothly.

## 3. Resilience and Layout

- **Scenario G (Multi-tenant Isolation):** Using another test account (Account B) or API tooling (e.g., Postman), attempt to query or edit Account A's memory using Account A's memory UUID.
- **Expected:** The system strictly rejects access. Supabase RLS enforces `auth.uid() = user_id`, rejecting cross-tenant operations.

- **Scenario H (Mobile Layout):** Verify the timeline UI on a mobile device or Chrome DevTools set to a 375px viewport.
- **Expected:** The layout is fully responsive, setting a `min-h-[dvh]`, with minimum 44x44px touch targets. There is zero horizontal overflow.

- **Scenario I (Architectural Hygiene):** Review the PR or codebase.
- **Expected:** `src/middleware.ts` remains untouched. Zero files reside in the deprecated `docs/project-memory/` directory. Zero raw metadata (DB UUIDs, timestamps, bucket paths) leak into the client DOM or network responses for client components.
