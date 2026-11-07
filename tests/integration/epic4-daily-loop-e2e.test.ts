import { describe, it, mock, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert";

process.env.NEXT_RUNTIME = "nodejs";

import * as serverClientModule from "@/lib/supabase/server";
import {
  getTimelineMemories,
  getTimelineMemoryDetail,
  deleteMemory,
  updateMemoryText,
} from "@/lib/ai/memory-db";
import { generateMemorySummary } from "@/lib/ai/memory-generator";
import { storageService } from "@/lib/storage/storage-service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDailySuggestion } from "@/lib/ai/suggestion-generator";

describe("Epic 4: Daily Loop End-to-End E2E Validation", () => {
  const userId = "test-e2e-user-id";
  let fetchMock: unknown;

  beforeEach(() => {
    mock.restoreAll();

    // Mock getSupabaseServerClient to avoid Next.js request scope errors
    const mockSupabase = {
      from: mock.fn(() => ({
        select: mock.fn(() => ({
          eq: mock.fn(() => ({
            single: mock.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: mock.fn(() => ({
          select: mock.fn(() => ({
            single: mock.fn(async () => ({
              data: { id: "test-id" },
              error: null,
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    mock.method(
      serverClientModule,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    // Default fetch mock for AI generation
    fetchMock = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                primarySuggestion: "Take a 5-minute walk",
                supportingContext: "Step outside to refresh.",
                estimatedDuration: "5m",
                categoryTags: ["movement", "outdoors"],
                alternatives: ["Read a book", "Do some stretches"],
              }),
            },
          },
        ],
      }),
    }));
    Object.defineProperty(global, "fetch", {
      value: fetchMock,
      writable: true,
      configurable: true,
    });

    // Default Storage Mocks
    mock.method(
      storageService,
      "getSignedUrl",
      async () => "https://signed.url/test-photo.jpg",
    );
    mock.method(storageService, "deleteFile", async () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("Validates suggestion generation and formatting", async () => {
    const result = await generateDailySuggestion(userId);

    assert.ok(result);
    assert.strictEqual(result.primarySuggestion, "Take a 5-minute walk");
    assert.strictEqual(result.estimatedDuration, "5m");
    assert.deepStrictEqual(result.categoryTags, ["movement", "outdoors"]);
  });

  it("Validates AI summary generation from capture", async () => {
    // We adjust the fetch mock to return a summary format for this test specifically
    const summaryFetchMock = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summaryText: "Took a nice walk and felt the breeze.",
              }),
            },
          },
        ],
      }),
    }));
    Object.defineProperty(global, "fetch", {
      value: summaryFetchMock,
      writable: true,
      configurable: true,
    });

    // Generate AI summary for a capture with a note
    const summary = await generateMemorySummary(userId, {
      noteText: "I took a nice walk and felt the breeze.",
      mediaMetadata: null,
      suggestionTitle: null,
    });

    assert.ok(summary);
    assert.strictEqual(
      summary.summaryText,
      "Took a nice walk and felt the breeze.",
    );
  });

  it("Validates fallback memory generation on AI timeout", async () => {
    // Mock fetch to timeout/fail
    const failedFetchMock = mock.fn(async () => {
      throw new Error("Timeout");
    });
    Object.defineProperty(global, "fetch", {
      value: failedFetchMock,
      writable: true,
      configurable: true,
    });

    const summary = await generateMemorySummary(userId, {
      noteText: null,
      mediaMetadata: null,
      suggestionTitle: null,
    });

    // The fallback logic provides a grounded statement.
    assert.ok(summary.summaryText.length > 0);
    assert.strictEqual(summary.summaryText, "Recorded a quiet moment today.");
  });

  it("Validates timeline retrieval and memory metadata safety", async () => {
    const memory = {
      id: "mem-1",
      user_id: "secret-uuid",
      capture_id: "cap-1",
      suggestion_id: "sug-1",
      summary_text: "Took a 5-minute walk.",
      media_metadata_ref: null,
      created_at: "2023-10-24T10:00:00.000Z",
      captures: { media_metadata: { storagePath: "user-1/photo.jpg" } },
      daily_suggestions: { primary_suggestion: "Take a walk" },
    };

    const mockSupabase = {
      from: mock.fn(() => ({
        select: mock.fn(() => ({
          eq: mock.fn(() => ({
            order: mock.fn(() => ({
              order: mock.fn(() => ({
                limit: mock.fn(async () => ({ data: [memory], error: null })),
              })),
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    mock.method(
      serverClientModule,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const response = await getTimelineMemories(userId, { limit: 10 });

    assert.strictEqual(response.items.length, 1);
    const item = response.items[0];

    // Validate metadata safety (zero leakage of underlying IDs and timestamps)
    const rawItem = item as Record<string, unknown>;
    assert.strictEqual(rawItem.user_id, undefined);
    assert.strictEqual(rawItem.created_at, undefined);
    assert.strictEqual(rawItem.captures, undefined);

    // Validate mappings
    assert.strictEqual(item.id, "mem-1");
    assert.strictEqual(item.summaryText, "Took a 5-minute walk.");
    assert.ok(String(item.photoUrl).startsWith("https://signed.url/"));
  });

  it("Validates detail view retrieval, text edit, and deletion (source preservation)", async () => {
    const memory = {
      id: "mem-1",
      summary_text: "Original memory text",
      created_at: new Date("2023-10-24T10:00:00Z").toISOString(),
      suggestion_id: null,
      media_metadata_ref: null,
      captures: {
        note_text: "Original note",
        media_metadata: { storagePath: "path/photo.jpg" },
      },
      daily_suggestions: null,
    };

    let deleteCalledOnTable = "";

    const mockSupabase = {
      from: mock.fn((table: string) => {
        return {
          select: mock.fn(() => {
            const eqMock2 = mock.fn(() => ({
              single: mock.fn(async () => ({ data: memory, error: null })),
            }));
            const eqMock1 = mock.fn(() => ({
              eq: eqMock2,
            }));
            return { eq: eqMock1 };
          }),
          update: mock.fn(() => {
            const singleMock = mock.fn(async () => ({
              data: { ...memory, summary_text: "Updated text" },
              error: null,
            }));
            const selectMock = mock.fn(() => ({ single: singleMock }));
            const eqMock2 = mock.fn(() => ({ select: selectMock }));
            const eqMock1 = mock.fn(() => ({ eq: eqMock2 }));
            return { eq: eqMock1 };
          }),
          delete: mock.fn(() => {
            deleteCalledOnTable = table;
            const eqMock2 = mock.fn(async () => ({ error: null }));
            const eqMock1 = mock.fn(() => ({ eq: eqMock2 }));
            return {
              eq: eqMock1,
            };
          }),
        };
      }),
    } as unknown as SupabaseClient;

    mock.method(
      serverClientModule,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    // 1. Detail Retrieval
    const detail = await getTimelineMemoryDetail(userId, "mem-1");
    assert.ok(detail);
    assert.strictEqual(detail.summaryText, "Original memory text");

    // 2. Text Edit
    const updated = await updateMemoryText(userId, "mem-1", "Updated text");
    assert.ok(updated);
    assert.strictEqual(updated.summaryText, "Updated text");

    // 3. Deletion (Source preservation)
    const delResult = await deleteMemory(userId, "mem-1");
    assert.strictEqual(delResult, true);
    assert.strictEqual(
      deleteCalledOnTable,
      "memories",
      "Delete should strictly target the memories table, leaving captures intact.",
    );
  });
});
