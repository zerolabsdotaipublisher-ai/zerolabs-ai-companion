# Context Retrieval Design

## 1. Overview & Objectives

The purpose of the short-term conversation context retrieval strategy is to provide the AI Companion with the necessary recent history to maintain a coherent and engaging active thread. This ensures the AI can follow immediate context without suffering from hallucination or repetition.

This strategy is deeply aligned with the "Quiet Companion" philosophy. By focusing strictly on relevant recent interactions, the AI maintains a calm, minimal, and non-intrusive presence. It avoids overwhelming the prompt with historical baggage, ensuring responses are focused and grounded in the present conversation.

## 2. Recent History Structure & Sanitization

Recent history is queried directly from PostgreSQL using the data access methods provided in `src/lib/ai/db-service.ts` (e.g., `getConversationMessages`).

The retrieval process enforces a strict data transformation pipeline:

1. **Fetch:** Retrieve raw message records from the `messages` table.
2. **Transform:** Map database records to the OpenAI prompt format required by the orchestrator.
   - The database field `role` maps to `{ role: 'user' | 'assistant' }`.
   - The database field `content` maps to `{ content: string }`.
3. **Sanitize:** To prevent internal metadata leakage and security risks, all raw database properties are strictly stripped before the payload reaches the OpenAI API.
   - Explicitly excluded fields: `id`, `conversation_id`, `user_id`, `created_at`, `updated_at`.
   - Resulting objects are pure `{ role, content }` structures.

## 3. Sliding History Window & Retrieval Limits

To balance coherence with performance and cost, context retrieval utilizes a sliding history window:

- **Window Boundaries:** The system retrieves the last 20 message turns (approximately 10 user-assistant pairs).
- **Token Constraints:**
  - The total aggregated context payload is capped at a strict token limit to reserve sufficient context window for system prompts, identity preferences (via `src/lib/ai/context-builder.ts`), and the model's output generation.
  - Extremely long individual messages are truncated to a sensible character limit before mapping to ensure they do not consume the entire sliding window budget.
- **Edge Cases:**
  - _Empty Thread:_ If no history exists, the orchestrator proceeds with only the system and user context builders.
  - _Single Message:_ The system handles singular user inputs gracefully without failing.
  - _Truncation:_ Long inputs exceeding predefined thresholds are truncated with an appended indicator (e.g., `... [truncated]`) to preserve token limits while signaling omitted context to the LLM.

## 4. Performance & Query Latency Review

- **Database Latency:** The queries rely on the existing composite index `messages(conversation_id, created_at ASC)`. This index ensures that fetching the most recent `N` messages is highly optimized, resulting in minimal database latency (typically <10ms for small limits).
- **Overhead Analysis:** By strictly limiting the sliding window to 20 messages, we control the token payload sent to OpenAI. This predictably caps the API roundtrip latency and normalizes billing costs, preventing runaway expenses on deep conversation threads.
- **Justification:** A window of 20 messages is sufficient to maintain topic continuity in short-to-medium interactions without incurring the exponential latency or token costs associated with passing full unsummarized thread histories.

## 5. Security, Isolation & RLS Enforcement

Context retrieval is securely bound to the authenticated user's session:

- **RLS Enforcement:** All database interactions in `src/lib/ai/db-service.ts` must use the cookie-safe SSR Supabase client (`src/lib/supabase/server.ts`).
- **Isolation:** Because the Supabase client injects the authenticated user's token (`auth.uid()`), PostgreSQL Row Level Security (RLS) natively guarantees that users can only query messages linked to their own `user_id`. This architecturally prevents cross-tenant context contamination.

## 6. Non-Goals & Future Scale Deferrals

To maintain project velocity and system simplicity during this phase, the following advanced retrieval mechanisms are explicitly deferred to later Scale Phases:

- Semantic vector indexing and retrieval (e.g., Qdrant).
- Complex cross-session memory synthesis.
- Life graphs or long-term journal schemas.

Current focus remains strictly on immediate, short-term conversational context within isolated threads.
