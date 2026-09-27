# Today Experience Design

## 1. Overview & Product Surface Architecture

The `/today` surface is the primary daily entry point for the AI Companion. It shifts the core product paradigm from open-ended chat prompting to an **action-first loop**: Understand User -> Suggest -> Act -> Capture -> Memory -> Timeline.

Aligning with the "Quiet Companion" ethos, `/today` is designed to be minimalist, low friction, and non-demanding. The engagement is targeted to take less than 10 seconds—a quick glance, a single-tap decision. There is zero guilt for skipping a suggestion, no nagging, no coaching, and no productivity tracking. The goal is to gently inspire real-world action, not trap the user in the app.

## 2. Primary Suggestion Presentation & Visual Layout

The primary suggestion is presented as a clean, focused card providing immediate clarity.

### Visual Hierarchy

- **Actionable Activity Title**: Bold, readable typography detailing the specific action (e.g., "Take a 15-minute walk without your phone").
- **Duration Badge**: A subtle pill indicating the time commitment (e.g., "15m", "30m", "flex").
- **Category Pills**: Lightweight contextual tags (e.g., "outdoor", "mindful") identifying the nature of the activity.
- **Supporting Rationale**: A concise 1–2 sentence description reflecting the companion's current persona (e.g., "You've been indoors all morning. A quick screen-free walk will clear your head and fits a spontaneous vibe.").

### Responsive Design

- **Mobile Viewport (375px optimized)**: Uses dynamic viewport height (`h-[100dvh]`) to prevent virtual keyboard cutoff. The layout must have zero horizontal scroll overflow. Interactive elements (buttons) must be thumb-friendly with minimum 44x44px tap targets.
- **Desktop Viewport**: Encapsulated within a centered, constrained max-width container (`max-w-xl` or `max-w-2xl`). The UI maintains visual calm and breathing room, avoiding stretching across wide screens.

## 3. Alternative Suggestions Interaction Model

If the primary suggestion does not resonate, the user can easily access optional alternatives.

### Presentation

The 1–2 alternative suggestions are presented using a lightweight, non-distracting pattern, such as a subtle accordion drawer, a clean card stack underneath the primary suggestion, or a low-contrast "Try another" toggle trigger.

### Interaction Flow

When an alternative is inspected or selected, it smoothly transitions into the active focus area, functionally replacing the primary recommendation for that session, while keeping the UI stable.

## 4. Action Interaction Model & State Machine UI Mapping

The `/today` UI controls directly map to the backend `daily_suggestions.status` lifecycle state machine.

### State Mapping

- **"Do it" / "Accept"**: Updates status to `accepted`. The UI transitions to a calm, positive confirmation state (e.g., a subtle checkmark or supportive message), laying the foundation for future experience capture (AIC-403).
- **"Skip"**: Updates status to `skipped`. The UI gracefully dismisses the recommendation with zero guilt, transitioning the viewport to a calm resting state (e.g., "All set for today").
- **"Try another"**: Updates status to `alternative_requested`. Triggers the UI to display the generated alternative options.

### Idempotency and State Locking

To prevent duplicate network requests and race conditions, the UI must enforce state locking during in-flight actions (e.g., disabling buttons with `disabled={isSubmitting}`). Transitions are idempotent; re-submitting an already accepted suggestion yields a silent success.

## 5. Empty, Loading, and Error States

### Loading State

When fetching or generating a suggestion, the UI displays calm, subtle pulsing skeleton loaders matching the Tailwind theme. Harsh, full-screen loading spinners are strictly avoided.

### Empty State

When no suggestion is pending, or after a user has completed/skipped their daily activity, a clean, supportive placeholder is shown (e.g., "You're all set for today. Enjoy the moment.").

### Error State

If a network failure occurs or the AI generation fails, a non-intrusive inline error boundary banner is displayed. It includes a subtle, interactive "Retry" trigger, ensuring the full page does not unmount or crash.

## 6. Integration with Companion Conversation (Refinement Model)

Users can engage in conversational refinement if they want a tweaked suggestion without dismissing the idea entirely.

### Integration

- **Refinement Trigger**: A lightweight button or inline prompt (e.g., "Ask companion about this" or "Something indoors instead?") positioned near the suggestion.
- **Architecture Reuse**: The refinement action reuses the Epic 3 conversation architecture (`POST /api/ai/conversation`, `composePrompt`, and `src/lib/ai/prompt-composer.ts`).
- **Context injection**: The client supplies the current daily suggestion context in the background when opening the chat bridge, allowing the AI to understand what activity the user is questioning, without needing duplicate AI services.

## 7. Security, Isolation & Multi-Tenancy

- **Server-Side Isolation**: All server-side data fetching and action routes must use the `import 'server-only'` pragma.
- **Data Fetching & RLS**: Data operations must rely on the cookie-safe Supabase server client (`src/lib/supabase/server.ts`), ensuring Postgres Row Level Security (`auth.uid() = user_id`) is strictly honored.
- **Zero Raw Database Metadata**: Client view models must never receive raw database primary keys, user UUIDs, timestamps, or internal RLS parameters. These must be stripped at the server layer.
- **Zero Middleware Overhead**: The global `middleware.ts` file must remain completely untouched. No database calls, routing guards, or AI integration overhead may be added to Edge runtime middleware.

## 8. Explicit Non-Goals & Deferrals

This document serves strictly as a design specification. The following implementation phases are explicitly deferred:

- Task 2.2: React UI component coding for the `/today` page.
- Task 2.3: Interactive action wiring and state management.
- Task 2.4: Conversational bridge wiring for suggestion refinement.
- Epic AIC-403: Experience capture flows.
- Epic AIC-406: Life timeline view.
- Scale Phase: Qdrant semantic vector memory integration.
