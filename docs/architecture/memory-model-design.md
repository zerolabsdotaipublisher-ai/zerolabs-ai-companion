# Memory Model Design

## 1. Overview & Product Loop Role

The Generate Memory system is a core component of the AI Companion's action-first daily loop: **Understand User -> Suggest -> Act -> Capture -> Generate Memory -> Timeline**.

In alignment with the "Quiet Companion" ethos, memories are generated passively as a byproduct of real-world action. There is zero requirement for manual journaling, complex reflection forms, productivity tracking, or streak guilt. The system automatically converts minimal user inputs (a quick note or a simple photo upload from a capture) into a concise, 1-line memory summary. This ensures the app experience remains frictionless and non-demanding while steadily building a meaningful timeline of the user's experiences.

## 2. Canonical Life Memory Data Model & Schemas

The canonical representation of a Life Memory separates the raw database entity from the client-facing view model and AI prompt structures. The following TypeScript interfaces and Zod schemas enforce these data boundaries. To adhere to the "Zero Raw DB Rows" rule, all primary keys (UUIDs), user IDs, and timestamps must be stripped from the `ClientMemory` interface.

### TypeScript Interfaces & Zod Validation

```typescript
import { z } from "zod";

// Optional JSONB reference mapping to the source capture's media_metadata
export const MediaMetadataRefSchema = z.object({
  storagePath: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadedAt: z.string().datetime(),
});

export type MediaMetadataRef = z.infer<typeof MediaMetadataRefSchema>;

// Input validation schema for creating a new memory record
export const CreateMemoryInputSchema = z.object({
  captureId: z.string().uuid().describe("UUID referencing captures.id"),
  suggestionId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe("Optional UUID referencing daily_suggestions.id"),
  summaryText: z
    .string()
    .max(280)
    .trim()
    .describe(
      "Concise string representing the AI-generated 1-line memory summary",
    ),
  mediaMetadataRef: MediaMetadataRefSchema.optional().nullable(),
});

export type CreateMemoryInput = z.infer<typeof CreateMemoryInputSchema>;

// Canonical database entity schema
export const MemorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().describe("UUID referencing auth.users(id)"),
  captureId: z.string().uuid().describe("UUID referencing captures.id"),
  suggestionId: z.string().uuid().optional().nullable(),
  summaryText: z.string().max(280).trim(),
  mediaMetadataRef: MediaMetadataRefSchema.optional().nullable(),
  createdAt: z.string().datetime().describe("UTC TIMESTAMPTZ"),
  updatedAt: z.string().datetime().describe("UTC TIMESTAMPTZ"),
});

export type Memory = z.infer<typeof MemorySchema>;

// Sanitized client-facing view model
export type ClientMemory = Omit<
  Memory,
  "id" | "userId" | "captureId" | "suggestionId" | "createdAt" | "updatedAt"
>;
```

### Data Boundary Rules

Raw database primary keys (UUIDs), user IDs, internal references (like `captureId` and `suggestionId`), and timestamps must never leak into client view models or downstream LLM prompt contexts.

## 3. Entity Associations & Source Preservation

The Memory entity is fundamentally a derived view representing a distilled life event. It maintains strict association models to preserve the original source material.

### Association Model

- **Mandatory Linkage to Capture:** The `captureId` field securely links the memory to its source capture (`captures.id`). At the database level, this constraint must enforce `ON DELETE CASCADE`.
- **Optional Linkage to Suggestion (Dual Source):** The `suggestionId` field natively supports both suggestion-linked captures (carrying context forward from the AI suggestion) and spontaneous direct captures (where `suggestionId` is `null`). At the database level, this enforces `ON DELETE SET NULL`.

### Source Preservation

The original capture data (`note_text` and `media_metadata` from the `captures` table) is considered immutable source material. The Generate Memory pipeline must never mutate the source capture. Instead, it extracts the context to synthesize the `summaryText` and simply references any media attachments via `mediaMetadataRef`.

## 4. AI Memory Summary Generation Contract

The Generate Memory pipeline converts captures into 1-line memory summaries. This relies on an explicit generation contract via OpenAI structured outputs.

### Contract Schema

```typescript
export const MemorySummaryOutputSchema = z.object({
  summaryText: z
    .string()
    .describe("A single, concise sentence summarizing the experience."),
});
```

### Guardrails

- **Conciseness:** The output must be exactly one single sentence, strictly capped under 280 characters.
- **Strict Grounding:** The summary must be grounded strictly in the source capture's text and/or photo context. The AI must exhibit zero hallucination and must not invent details.
- **Tone Alignment:** The summary must reflect the quiet, supportive, and non-judgmental tone of the Quiet Companion.

## 5. Security, Isolation & Multi-Tenancy

Security and multi-tenancy are enforced primarily at the server level, utilizing robust Postgres and Supabase tools.

- **Server-Side Isolation:** Future data fetches, AI generation steps, and database persistence helpers must run strictly server-side, utilizing the `import 'server-only'` pragma.
- **Supabase Row Level Security (RLS):** All data operations must use the cookie-safe SSR Supabase client (`src/lib/supabase/server.ts`). RLS policies for the underlying `memories` table must strictly restrict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations to `auth.uid() = user_id`.
- **Zero Middleware Overhead:** The global Next.js `middleware.ts` will remain completely untouched. All authorization and isolation mechanisms run securely within isolated server components or server actions.

## 6. Preparation for Future Semantic Enrichment & Non-Goals

The current memory schema covers the MVP requirement for simple, non-intrusive life reflection. However, the model is prepared for subsequent evolutionary phases.

### Extensibility Paths

- **Semantic Vector Storage:** In Stage 2, `summaryText` and its associated context can be seamlessly embedded into Qdrant for semantic search and retrieval.
- **Pattern Grouping & Story Generation:** Additional AI agents could analyze collections of memories grouped by timeframe (e.g., weekly or monthly) to produce holistic "Life Graphs" or rich narrative stories.
- **Media Expansion:** `mediaMetadataRef` could easily be scaled to an array to support multi-photo galleries per memory.

### Explicit Deferrals (Non-Goals)

To enforce strict boundaries on MVP scope, the following capabilities are explicitly deferred from this design specification:

- Programmatic AI generation pipeline implementation (Task 5.2).
- SQL database migrations for the `memories` table and persistence helper coding (Task 5.3).
- Memory review/edit UI screens (Task 5.4).
- Memory validation (Task 5.5).
- Life timeline feed implementation (`/timeline`, Story AIC-406).
- Qdrant vector memory integration.
