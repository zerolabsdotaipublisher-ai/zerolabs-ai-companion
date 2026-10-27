# AIC-405 Manual QA Scenarios for Memory Generation Lifecycle

## 1. Context and Generation Capabilities

- **Scenario A (Suggestion-linked Capture):** On the `/today` screen, complete an activity suggestion. Navigate to the capture flow, enter a brief note about the activity, and tap "Done".
- **Expected:** The system generates a single, concise memory summary accurately reflecting the note and the context of the linked daily suggestion, capped at 280 characters.

- **Scenario B (Spontaneous Direct Capture):** Use a global "Add" action to capture a spontaneous moment without a linked suggestion. Enter a note and submit.
- **Expected:** The system generates a single, concise memory summary representing the direct capture note context, keeping the suggestion context `null`.

- **Scenario C (Sparse Captures - Zero Detail/Photo-only):**
  - 1. Submit an empty capture (just tapping "Done").
  - 2. Submit a photo-only capture.
- **Expected:** The system provides a grounded fallback memory without hallucination (e.g. "Took a quiet moment to reflect today." or "Captured a beautiful scene today.") and does not throw an error.

## 2. Review and Edit User Interface

- **Scenario D (Memory Inline Editing):** Navigate to the memory review component (e.g. in the timeline or memory detailed view). Click "Edit" and change the memory text to something new. Hit "Save".
- **Expected:** The UI locks state during submission. The memory updates locally and on the server. Trying to save more than 280 characters should be impossible (disabled button or error banner).

- **Scenario E (Regeneration):** On the memory review component, click "Regenerate".
- **Expected:** The UI locks state (button says "Generating..."). The underlying source capture remains untouched while the AI generates a completely new 1-line memory text, replacing the current one.

## 3. Data Protection and Deletion

- **Scenario F (Deletion Source Preservation):** Click "Delete" on a generated memory.
- **Expected:** The memory row is fully deleted from the database. However, verifying the original capture source (e.g., in `/api/capture/history` or database view) confirms the raw capture text and uploaded photo remain fully intact.

## 4. Multi-Tenant Security & Resiliency

- **Scenario G (Row Level Security):** Authenticated as User A, attempt to `PATCH`, `DELETE`, or `POST /regenerate` on a memory `id` belonging to User B using API clients (e.g., Postman).
- **Expected:** The system strictly rejects access. Supabase RLS enforces `auth.uid() = user_id`, returning an error (e.g., 401/404).

- **Scenario H (Mobile Scaling):** View the memory edit component on a mobile device or Chrome DevTools set to a 375px viewport.
- **Expected:** The layout scales without horizontal overflow. Interaction targets (Edit/Regenerate/Delete) are at least 44x44px.

- **Scenario I (Architectural Hygiene):** Review the PR or local repository state.
- **Expected:** `src/middleware.ts` remains entirely untouched. No file modifications occur inside `docs/project-memory/` (zero Project Memory usage).
