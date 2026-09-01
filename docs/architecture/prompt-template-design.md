# Prompt Template Design Specification

## 1. Overview & Core Product Persona

### Purpose

The purpose of centralizing prompt generation across the application is to ensure that every AI request strictly follows a unified, deterministic, and highly structured format. A centralized architecture prevents prompt fragmentation, simplifies updates to the core persona, and guarantees that context window limits, token budgets, and security protocols are consistently applied to all LLM interactions.

### Core Product Identity: The "Quiet Companion"

The AI Companion is defined as a "quiet companion"—a presence that is calm, supportive, minimalist, non-intrusive, and suggestion-first. Its communication style must be concise, conversational, and deeply empathetic without being overbearing.

### Guardrails Against Persona Drift

To prevent the AI from slipping into unwanted behaviors, the system prompt must strictly enforce the following guardrails:

- **No lecturing:** The AI must not act like a strict productivity coach or teacher.
- **No nagging:** The AI must not pester the user or demand action.
- **No mandatory journaling:** The AI must not force the user into structured journaling prompts.
- **Suggestion-first:** It should offer gentle suggestions or reflections rather than directives.

---

## 2. Four-Tier Prompt Composition Model

Every outgoing prompt to the LLM is constructed using a strict four-tier sequence. Delimiters (such as `---` or XML-style tags) will be used to cleanly separate these tiers, preventing prompt injection attacks or context confusion.

### A. System Prompt Tier

This is the foundational layer.

- **Content:** Contains the core persona directives ("quiet companion"), tone guidelines, brevity expectations, and safety/behavioral constraints.
- **Purpose:** Instructs the LLM on _how_ to behave and _what_ rules to follow.

### B. User Context Tier

This tier provides relevant information about the user.

- **Content:** Standardized injection of sanitized user profile preferences from the `PromptContext`.
- **Fields:**
  - `displayName`: Extracted from preferences. Fallback: `"Friend"`.
  - `companionVibe`: Extracted from preferences. Fallback: `"Spontaneous"`.
- **Purpose:** Gives the AI the necessary personal grounding without leaking sensitive data.

### C. Conversation Context Tier

This tier represents the short-term memory of the active conversation.

- **Rules & Constraints:**
  - **Sliding Window:** Chronological history bounded by the 20 most recent messages.
  - **Truncation:** A 1,000-character ceiling per turn. Excess content is truncated and appended with `"... [truncated]"`.
  - **Role Mapping:** Strict mapping to either `'user'` or `'assistant'`. Any unsupported roles are filtered out.
  - **Deduplication:** The latest retrieved history turn is filtered out if it exactly matches the active user prompt to prevent duplicate entries.
- **Purpose:** Provides recent conversational context efficiently.

### D. User Message Tier

This is the active input from the user.

- **Content:** The incoming user prompt.
- **Sanitization:** Cleanly placed after being sanitized of HTML, control characters, and excess whitespace.
- **Purpose:** The immediate query or statement the AI needs to respond to.

---

## 3. Data Contracts & Template Abstraction

The prompt engine will rely on strict TypeScript interfaces and Zod validation schemas.

### Interfaces & Specifications

```typescript
// Zod schemas for input validation
import { z } from "zod";

export const PromptContextSchema = z.object({
  displayName: z.string().optional().default("Friend"),
  companionVibe: z.string().optional().default("Spontaneous"),
});

export const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().trim().min(1),
});

export const HistoryTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// TypeScript Interfaces
export type PromptContext = z.infer<typeof PromptContextSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export interface PromptTemplateInput {
  systemDirectives: string;
  context: PromptContext;
  history: HistoryTurn[];
  activeMessage: UserMessage;
}
```

### Deterministic Interpolation & Fallbacks

String interpolation must be deterministic. If a preference value is `null`, `undefined`, or missing, the defined fallback (e.g., `"Friend"`, `"Spontaneous"`) is explicitly injected. This ensures the template never contains artifacts like `"undefined"` or `"null"` strings, which could confuse the LLM.

---

## 4. Token Budget & Performance Optimization

To avoid context window blowouts, optimize round-trip latencies, and control billing, strict character/token budgets are enforced.

### Token & Character Budgets

- **System Prompt Tier:** ~500 tokens (fixed, carefully golfed for brevity).
- **User Context Tier:** ~50 tokens (small set of key-value pairs).
- **Conversation Context Tier:** Max 20 messages \* Max 1,000 chars per message ≈ 20,000 characters (roughly ~5,000 tokens maximum).
- **User Message Tier:** Limit applied upstream (e.g., max 2,000 chars, ~500 tokens).
- **Total Payload Ceiling:** Approximately 6,000 - 6,500 tokens.

### Overhead Analysis

- **Single-turn Conversations:** Overhead is extremely low (~550 tokens for System + Context), resulting in fast response times.
- **Multi-turn Conversations:** Growth is strictly capped by the 20-message sliding window and the 1,000-character per-turn limit, ensuring the context never unexpectedly scales into tens of thousands of tokens, thereby keeping latency predictable.

---

## 5. Security, Isolation & Server Boundaries

### Strict Data Isolation

Raw database metadata must NEVER reach the prompt payload. The following are strictly stripped before context compilation:

- Postgres primary keys (`id`)
- Foreign UUIDs (`conversation_id`, `user_id`)
- Database timestamps (`created_at`, `updated_at`)
- Row Level Security (RLS) parameters

### Server-Only Compilation

The entire prompt generation engine must execute strictly server-side.

- Modules implementing this logic must include the `'server-only'` directive at the top of the file.
- It will execute within Next.js Server Components or backend route handlers.

### Zero Middleware Overhead

The prompt logic and any associated database lookups for context gathering will NOT be placed in `middleware.ts`. This guarantees zero Edge runtime overhead and prevents unnecessary performance penalties on standard routing.

---

## 6. Non-Goals & Scale Phase Deferrals

To maintain focus and deliver a stable initial architectural implementation, the following items are explicitly out of scope for the current phase:

- **Semantic Vector Memory:** Integrations with vector databases (e.g., Qdrant) and embedding pipelines are deferred to the Scale Phase.
- **Cross-Session Retrieval:** Long-term, cross-session knowledge retrieval and semantic search are deferred.
- **Life Graphs:** Complex entity relationship mapping and journaling schemas are deferred.
- **Implementation Note:** This document represents the pure architectural design. Programmatic code implementation of the prompt template engine is deferred to subsequent AIC-306 tasks.
