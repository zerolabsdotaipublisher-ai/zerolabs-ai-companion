# Architectural Specification: Server-side AI Conversation API

## Overview
This document specifies the architectural design for the Server-side AI Conversation API within the Next.js App Router application. The API communicates with the OpenAI LLM securely from the backend to deliver responses to users, acting as the integration layer between the internal architecture (context builder, database) and external AI provider (OpenAI).

## Design Constraints
- **Strict Server-Side Execution:** The integration relies strictly on Next.js Server Components, Server Actions, or Route Handlers using the `'server-only'` pragma. No LLM integration or API keys should leak to the client side. `middleware.ts` is strictly free of AI and database overhead.
- **Sanitized Context Payload:** Only structured and strictly sanitized contexts (via `PromptContext`) are sent to the LLM to prevent raw database rows, IDs, and metadata from leaking.
- **No Database Persistence in this Phase:** Persistent mechanisms and history tracking within the database are explicitly out of scope for this task (deferred).
- **Zod for Validation:** All incoming and outgoing requests must be structurally parsed and validated using Zod.

## API Contract

### Request Model
The Request Model (`ConversationRequest`) structure accepts a sanitized context payload and user prompt data to initiate an OpenAI API query.

```typescript
type ConversationRequest = {
  context: PromptContext;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  settings?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
};
```

### Response Model
The Response Model (`ConversationResponse`) returns a structured LLM response, abstracting raw OpenAI responses into an internal consistent payload.

```typescript
type ConversationResponse = {
  message: {
    role: "user" | "assistant" | "system";
    content: string;
  };
  metadata?: {
    model: string;
    finish_reason?: string;
    [key: string]: unknown;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
```

## Execution Lifecycle
1. **Request Intake:** Route Handlers or Server Actions receive the incoming request containing the conversation history.
2. **Context Resolution:** The backend invokes the `buildPromptContext` helper to fetch user context data (safely parsed from DB rows).
3. **Validation (Zod):** The structured request object (combined payload + context + settings) is validated strictly against the `ConversationRequestSchema`.
4. **OpenAI Call:** The backend calls the external OpenAI API using sanitized payloads.
5. **Response Validation (Zod):** The raw JSON output provided by OpenAI is validated against the `ConversationResponseSchema`.
6. **Delivery:** The structured `ConversationResponse` is delivered to the invoking client or server context.

## Error Strategy
A standardized `ConversationError` schema manages graceful fallback handling. All errors yield a cohesive and defensive response shape that avoids server crashes or application regressions.

```typescript
type ConversationError = {
  error: true;
  code: "RATE_LIMIT_EXCEEDED" | "TIMEOUT" | "API_ERROR" | "INVALID_REQUEST" | "INTERNAL_ERROR";
  message: string;
  details?: Record<string, unknown>;
};
```

- **OpenAI Timeouts:** Handle via AbortControllers; return `{ error: true, code: "TIMEOUT" }`.
- **Rate Limits:** Intercept HTTP 429 errors from OpenAI and return `{ error: true, code: "RATE_LIMIT_EXCEEDED" }`.
- **API Failures:** Handle connection/authentication issues from OpenAI via `{ error: true, code: "API_ERROR" }`.
- **Validation Issues:** If incoming parameters (or LLM output) do not match Zod criteria, return `{ error: true, code: "INVALID_REQUEST" }`.
- **Fallback Defaults:** Unknown exceptions map to `{ error: true, code: "INTERNAL_ERROR" }` to prevent leakage of backend stack traces.