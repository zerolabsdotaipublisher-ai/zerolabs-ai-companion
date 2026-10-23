# Timeline Retrieval Design

## 1. Overview & Timeline Philosophy

The Timeline system is a core component of the AI Companion's action-first daily loop: **Understand User -> Suggest -> Act -> Capture -> Generate Memory -> Timeline**.

In alignment with the "Quiet Companion" ethos, the timeline is a simple, peaceful, chronological life record where memories accumulate automatically as a byproduct of real-world action. There is zero social feed pressure, zero habit tracking, zero productivity scoring, and zero streak guilt. It serves strictly as a private, immutable historical log of generated memory summaries and their associated captures.

## 2. Chronological Retrieval Model & Data Contracts

The retrieval model mandates a newest-first sorting specification (`created_at DESC`). The canonical representation of the Timeline separates the raw database entities from the client-facing view models. All raw database primary keys (UUIDs), internal foreign UUIDs, user IDs, raw timestamps, and storage bucket paths must be aggressively stripped before leaving the server environment (`import 'server-only'`).

### TypeScript Interfaces & Zod Validation

```typescript
import { z } from "zod";

export const TimelineQueryInputSchema = z.object({
  limit: z.number().int().min(1).max(20).default(10),
  cursor: z
    .string()
    .optional()
    .describe("Keyset cursor: composite of created_at and id"),
  // Filter placeholders
  suggestionId: z
    .string()
    .uuid()
    .optional()
    .describe("Filter by specific suggestion"),
});

export type TimelineQueryInput = z.infer<typeof TimelineQueryInputSchema>;

export const ClientTimelineItemSchema = z.object({
  id: z.string().describe("Client-safe reference ID for detail routing"),
  summaryText: z.string().max(280),
  displayDateTime: z.string().datetime(),
  photoSignedUrl: z.string().url().optional(),
  suggestionTitle: z.string().optional(),
  originType: z.enum(["suggestion", "spontaneous"]),
});

export type ClientTimelineItem = z.infer<typeof ClientTimelineItemSchema>;

export const TimelineResponseSchema = z.object({
  items: z.array(ClientTimelineItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;
```

## 3. Media Association & Source Capture Integration

The Timeline seamlessly supports memories generated from both suggestion-linked captures (`suggestion_id` present) and spontaneous direct captures (`suggestion_id = null`).

**Relational Strategy:**
Retrieval executes a JOIN strategy linking `memories` to `captures` via `capture_id`, and optionally to `daily_suggestions` via `suggestion_id`.

**Media Retrieval Pipeline:**
When a source capture contains `media_metadata`, the retrieval system resolves photo attachments and generates short-lived signed URLs via `storageService.getSignedUrl()`.

**N+1 Query Prevention:**
To prevent N+1 query overhead during list retrieval, signed URLs for a paginated list of items must be generated concurrently via `Promise.all()` batching or bulk storage calls before serializing the final `TimelineResponse`.

## 4. Pagination & Query Performance Strategy

**Deterministic Pagination:**
The Timeline implements a deterministic, keyset cursor-based pagination strategy using the composite tuple `(created_at, id)`. This prevents duplicate or missing records if new memories are inserted into the system concurrently while the user is paginating. The page size defaults to 10 items, with a strict maximum cap of 20 items to guarantee bounded payload sizes.

**Query Performance & Index Audit:**
To guarantee sub-50ms query execution times, the retrieval model leverages the composite index on the `memories` table:
`CREATE INDEX idx_memories_user_id_created_at ON memories(user_id, created_at DESC);`
All JOINs on foreign keys (`capture_id`, `suggestion_id`) are also fully indexed.

## 5. Security, Multi-Tenancy & Isolation

The retrieval model guarantees strict multi-tenant isolation via the following constraints:

1. **Server-Only Execution:** All database interaction executes purely server-side (`import 'server-only'`) using cookie-safe SSR Supabase clients from `src/lib/supabase/server.ts`.
2. **Postgres RLS Enforcement:** Supabase Row Level Security (RLS) is strictly enforced for all joined tables (`memories`, `captures`, `daily_suggestions`) using `auth.uid() = user_id`.
3. **Storage Security:** Supabase Storage RLS validates access for all resolved photo attachments before returning signed URLs.
4. **Zero Middleware Overhead:** The global Next.js `middleware.ts` is explicitly bypassed for API-level enforcement. Security relies strictly on RLS and typed server modules.

## 6. Future Filtering Compatibility & Non-Goals

**Extensibility:**
The API schema includes optional placeholders for future lightweight filtering requirements, such as narrowing the timeline by date ranges, specific categories, or separating suggestion-based memories from spontaneous captures.

**Deferred Scope (Non-Goals):**
The following tasks are strictly deferred from this specification:

- Building the frontend `/timeline` UI (Task 6.2).
- Implementing the detailed memory view UI (Task 6.3).
- Authoring the programmatic backend implementation for pagination (Task 6.4).
- Authoring Zod validation schema implementation (Task 6.5).
- Integrating the Timeline fully into the daily loop flows (Story AIC-407).
- Integrating Qdrant or semantic vector-based memory search capabilities.
