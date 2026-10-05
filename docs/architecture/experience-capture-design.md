# Experience Capture Design

## 1. Overview & Product Loop Architecture

The Experience Capture system is a critical component of the AI Companion's action-first daily loop: **Understand User -> Suggest -> Act -> Capture -> Generate Memory -> Timeline**.

Aligning completely with the "Quiet Companion" ethos, the capture process is designed to be minimalist and low-friction, ensuring user engagement takes less than 10 seconds. The philosophy emphasizes:

- **Zero Forced Journaling:** Logging experiences is entirely voluntary and highly flexible.
- **Minimalist Data Entry:** No mandatory fields beyond basic completion, allowing the user to simply tap "done" or leave a quick note.
- **Zero Guilt & Zero Nagging:** No streak tracking, productivity metrics, or nagging notifications to log activities.

## 2. Canonical Experience Capture Data Model & Schemas

The following TypeScript interfaces and Zod schemas define the canonical representation, input validation, and sanitized client-facing view models for captured experiences. To ensure absolute data boundary rules, raw database primary keys (UUIDs), user IDs, and timestamps are completely stripped from client view models and downstream LLM prompt contexts.

### TypeScript Interfaces & Zod Validation

```typescript
import { z } from "zod";

// Structured JSONB metadata contract for optional media attachments
export const MediaMetadataSchema = z.object({
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadedAt: z.string().datetime(),
});

export type MediaMetadata = z.infer<typeof MediaMetadataSchema>;

// Input validation schema for creating a new experience capture
export const CreateExperienceCaptureInputSchema = z.object({
  suggestionId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe("Optional UUID referencing daily_suggestions.id"),
  noteText: z
    .string()
    .max(1000)
    .trim()
    .optional()
    .nullable()
    .describe("Optional string for short notes or reflections"),
  mediaMetadata: MediaMetadataSchema.optional()
    .nullable()
    .describe("Optional media attachment metadata"),
});

export type CreateExperienceCaptureInput = z.infer<
  typeof CreateExperienceCaptureInputSchema
>;

// Canonical database entity schema
export const ExperienceCaptureSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().describe("UUID referencing auth.users(id)"),
  suggestionId: z.string().uuid().optional().nullable(),
  noteText: z.string().max(1000).trim().optional().nullable(),
  mediaMetadata: MediaMetadataSchema.optional().nullable(),
  createdAt: z
    .string()
    .datetime()
    .describe("UTC TIMESTAMPTZ, defaults to now()"),
});

export type ExperienceCapture = z.infer<typeof ExperienceCaptureSchema>;

// Sanitized client-facing view model
export type ClientExperienceCapture = Omit<
  ExperienceCapture,
  "id" | "userId" | "createdAt" | "suggestionId"
>;
```

## 3. Association Models

The Experience Capture schema supports a dual association model, ensuring flexibility in how users interact with the Companion.

- **Suggestion-Linked Captures:** Initiated directly from the `/today` screen when a daily suggestion's status is `'accepted'`. The capture retains the `suggestionId` (`daily_suggestions.id`), carrying the suggestion context forward and creating a traceable thread from AI recommendation to user action.
- **Direct / Spontaneous Captures:** Initiated independently by the user without an active daily suggestion. In this case, `suggestionId` remains `null`. This supports users who want to log an activity performed on their own initiative.

## 4. Media & Future Storage Preparation

While media attachments are not mandatory for MVP captures, the data model is designed to support future Supabase Storage photo integrations (Epic AIC-404).

The `mediaMetadata` field utilizes a structured JSONB contract containing:

- `storagePath`: Path to the file in Supabase Storage.
- `mimeType`: The media MIME type (e.g., `image/jpeg`).
- `fileSizeBytes`: Size of the file in bytes.
- `width` / `height`: Optional dimensions for image media.
- `uploadedAt`: UTC timestamp of the upload.

## 5. Security, Isolation & Multi-Tenancy

Security and multi-tenancy are strictly enforced at the server level, ensuring robust isolation without adding overhead to Edge middleware.

- **Server-Side Isolation:** Future data fetches and persistence helpers must run strictly server-side using the `import 'server-only'` pragma.
- **Supabase Row Level Security (RLS):** All data operations must use the cookie-safe SSR Supabase client (`src/lib/supabase/server.ts`). RLS policies must strictly restrict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations to `auth.uid() = user_id`.
- **Zero Middleware Overhead:** The global `middleware.ts` will remain completely untouched. Data fetching, validation, and database operations occur exclusively within isolated API routes or Server Components.

## 6. Future Extensibility & Non-Goals

To maintain focus and adhere to the "Quiet Companion" philosophy, MVP scope is tightly controlled.

### Extensibility Paths

The schema allows for future enrichment, such as:

- Location tags.
- Participants (who the user did the activity with).
- Emotional tone / sentiment analysis.

### Explicit Deferrals

The following implementations are explicitly deferred from this task and will be addressed in subsequent work:

- SQL database migrations and persistence helpers (Task 3.2).
- React `/capture` UI implementation (Task 3.3).
- Integration with the Today screen (Task 3.4).
- Supabase photo storage and upload pipeline (Epic AIC-404).
- AI memory generation and summarization (Epic AIC-405).
- Life timeline view (Epic AIC-406).
- Qdrant vector memory integration.
