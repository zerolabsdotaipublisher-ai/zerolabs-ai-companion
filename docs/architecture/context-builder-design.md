# Context Builder Design

## Executive Summary & Architecture Role

The Context Builder serves as a critical isolation and formatting layer between Supabase Postgres and the OpenAI API. Its primary role is to aggregate, filter, and format relevant user data and personalization settings from the database into a strict, predefined prompt payload. This design ensures that raw database records and private internal metadata are never transmitted directly to OpenAI. Instead, the OpenAI API receives only safe, scrubbed, and explicitly designed prompt context.

## Input Payload Contract

The Context Builder will accept data primarily from the `identity_profiles` table, focusing heavily on the `preferences` JSONB column.

The expected structural contract from `preferences` includes:

- `name` (string): The user's preferred display name.
- `companion_vibe` (string): The selected personality archetype or "vibe" of the AI companion.
- `onboarding_completed` (boolean): Whether the user has completed the initial onboarding flow.

Additional fields from `identity_profiles` (such as account status or subscription tier) may be passed in only if specifically required for altering prompt behavior, but internal database IDs, raw timestamps, and sensitive PII are excluded from the expected input contract.

## Defensive Parsing & Data Normalization

Given that `preferences` is stored as a loosely typed JSONB column, the Context Builder implements robust defensive parsing rules:

- **Safe Parsing Rules:**
  - The payload must be validated to ensure it is a non-null object.
  - Arrays are explicitly rejected (e.g., via `!Array.isArray(data)`) to prevent data corruption or processing errors.
  - Malformed JSON payloads or entirely missing properties are gracefully handled without crashing the prompt generation cycle.

- **Fallback Defaults:**
  - If `name` is missing or invalid, a fallback (e.g., "User" or "Friend") is provided.
  - If `companion_vibe` is missing or invalid, a system-default vibe (e.g., "friendly and helpful") is used.
  - If `onboarding_completed` is missing, it safely defaults to `false`.

## Prompt Context Output Structure

The output of the Context Builder is a sanitized, structured text block specifically formatted for injection into the OpenAI API's system messages.

**Example Output Representation:**

```json
{
  "role": "system",
  "content": "You are interacting with [Fallback/User Name]. Your persona/vibe is strictly set to: [Default/Selected Vibe]. Context: Onboarding is [completed/pending]. Do not break character."
}
```

_Note: The exact phrasing and layout will adapt based on the normalized input, but the output structure will always be deterministic, strictly string-based, or tightly structured JSON suitable for standard Chat Completions API calls._

## Edge Performance & Architectural Constraints

- **Zero Middleware Queries:** Context assembly and database lookups to construct this context run **strictly within Next.js Server Components or backend service helpers**. The Edge runtime in `middleware.ts` is explicitly kept free of database lookups to prevent severe performance penalties.
- **Server-Side Execution:** The extraction of `identity_profiles` and subsequent formatting happens purely on the server before standard API routes or Server Actions hand off data to OpenAI.

## Deferred Capabilities

To maintain focus and simplicity in the current phase of development, the following capabilities are explicitly deferred to the **Scale Phase**:

- **Semantic Vector Retrieval:** Integrations with Qdrant or other vector databases for long-term memory retrieval.
- **Life Graphs:** Advanced relationship mapping or entity extraction schemas.
- **Complex Journal Schemas:** Deep historical event parsing beyond simple key-value preference retrieval.
