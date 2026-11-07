import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { SupabaseClient } from "@supabase/supabase-js";
import * as serverClient from "@/lib/supabase/server";
import {
  getTimelineMemories,
  getTimelineMemoryDetail,
  deleteMemory,
  updateMemoryText,
} from "@/lib/ai/memory-db";
import { storageService } from "@/lib/storage/storage-service";

describe("Memory-to-Timeline Lifecycle Integration", () => {
  const userId = "user-123";
  let getSignedUrlMock: unknown;

  beforeEach(() => {
    mock.restoreAll();
    getSignedUrlMock = mock.method(storageService, "getSignedUrl", async (path: string) => `https://signed.url/${path}`);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("accumulates AI 1-line memories automatically in chronological order (created_at DESC)", async () => {
    const memory1 = {
      id: "mem-1",
      summary_text: "Had a great walk.",
      created_at: new Date("2023-10-24T10:00:00Z").toISOString(),
      suggestion_id: "sug-1",
      media_metadata_ref: null,
      captures: { media_metadata: { storagePath: "user-123/cap-1/photo1.jpg" } },
      daily_suggestions: { primary_suggestion: "Take a walk" },
    };

    const memory2 = {
      id: "mem-2",
      summary_text: "Read a book.",
      created_at: new Date("2023-10-24T12:00:00Z").toISOString(),
      suggestion_id: null,
      media_metadata_ref: null,
      captures: { media_metadata: null },
      daily_suggestions: null,
    };

    const limitMock = mock.fn(async () => ({
      data: [memory2, memory1], // Mocking newest-first order return
      error: null,
    }));
    const orderMock2 = mock.fn(() => ({ limit: limitMock }));
    const orderMock1 = mock.fn(() => ({ order: orderMock2 }));
    const eqMock = mock.fn(() => ({ order: orderMock1 }));
    const selectMock = mock.fn(() => ({ eq: eqMock }));
    const fromMock = mock.fn(() => ({ select: selectMock }));

    const mockSupabase = {
      from: fromMock,
    } as unknown as SupabaseClient;

    mock.method(serverClient, "getSupabaseServerClient", async () => mockSupabase);

    const response = await getTimelineMemories(userId, { limit: 10 });

    assert.strictEqual(response.items.length, 2);
    assert.strictEqual(response.items[0].id, "mem-2");
    assert.strictEqual(response.items[0].summaryText, "Read a book.");
    assert.strictEqual(response.items[0].originType, "direct");
    assert.strictEqual(response.items[0].photoUrl, undefined);

    assert.strictEqual(response.items[1].id, "mem-1");
    assert.strictEqual(response.items[1].summaryText, "Had a great walk.");
    assert.strictEqual(response.items[1].originType, "suggestion");
    assert.strictEqual(response.items[1].suggestionTitle, "Take a walk");
    assert.strictEqual(response.items[1].photoUrl, "https://signed.url/user-123/cap-1/photo1.jpg");

    // Assert DB ordering calls
    const orderCall1 = (orderMock1 as unknown as ReturnType<typeof mock.fn>).mock.calls[0];
    const orderCall2 = (orderMock2 as unknown as ReturnType<typeof mock.fn>).mock.calls[0];

    assert.strictEqual(orderCall1.arguments[0], "created_at");
    assert.deepStrictEqual(orderCall1.arguments[1], { ascending: false });

    assert.strictEqual(orderCall2.arguments[0], "id");
    assert.deepStrictEqual(orderCall2.arguments[1], { ascending: false });
  });

  it("verifies cursor pagination incremental loading based on (created_at, id)", async () => {
    const memory = {
      id: "mem-3",
      summary_text: "Pagination test",
      created_at: new Date("2023-10-23T10:00:00Z").toISOString(),
      suggestion_id: null,
      media_metadata_ref: null,
      captures: { media_metadata: null },
      daily_suggestions: null,
    };

    const limitMock = mock.fn(async () => ({
      data: [memory], // Has 1 item, but we ask for limit: 2 (fetching 3) -> hasMore = false
      error: null,
    }));
    const orderMock2 = mock.fn(() => ({ limit: limitMock }));
    const orderMock1 = mock.fn(() => ({ order: orderMock2 }));

    // Using simple mock chain. In reality, the 'or' condition handles the keyset logic
    const orMock = mock.fn(() => ({ order: orderMock1 }));
    // getTimelineMemories calls eq("user_id", userId), then or(...) if cursor exists
    const eqMock = mock.fn(() => ({ or: orMock }));
    const selectMock = mock.fn(() => ({ eq: eqMock }));
    const fromMock = mock.fn(() => ({ select: selectMock }));

    const mockSupabase = {
      from: fromMock,
    } as unknown as SupabaseClient;

    mock.method(serverClient, "getSupabaseServerClient", async () => mockSupabase);

    const cursorPayload = { createdAt: "2023-10-24T12:00:00Z", id: "mem-1" };
    const encodedCursor = Buffer.from(JSON.stringify(cursorPayload)).toString("base64");

    const response = await getTimelineMemories(userId, { limit: 2, cursor: encodedCursor });

    assert.strictEqual(response.items.length, 1);
    assert.strictEqual(response.items[0].id, "mem-3");
    assert.strictEqual(response.hasMore, false);
    assert.strictEqual(response.nextCursor, null);

    // Assert DB cursor or call
    const orCall = (orMock as unknown as ReturnType<typeof mock.fn>).mock.calls[0];
    assert.ok(orCall);
    assert.match(
      orCall.arguments[0] as string,
      /created_at\.lt\.2023-10-24T12:00:00Z,and\(created_at\.eq\.2023-10-24T12:00:00Z,id\.lt\.mem-1\)/
    );
  });

  it("verifies memory detail rendering and inline edits, keeping original capture intact", async () => {
    // 1. Setup mock for getTimelineMemoryDetail
    const memory = {
      id: "mem-1",
      summary_text: "Original memory text",
      created_at: new Date("2023-10-24T10:00:00Z").toISOString(),
      suggestion_id: null,
      media_metadata_ref: null,
      captures: { note_text: "Original note", media_metadata: { storagePath: "path/photo.jpg" } },
      daily_suggestions: null,
    };

    const singleMock = mock.fn(async () => ({ data: memory, error: null }));
    const eqMock2 = mock.fn(() => ({ single: singleMock }));
    const eqMock1 = mock.fn(() => ({ eq: eqMock2 }));

    // For updateMemoryText
    const updatedMemory = { ...memory, summary_text: "Updated text" };
    const singleUpdateMock = mock.fn(async () => ({ data: updatedMemory, error: null }));
    const selectUpdateMock = mock.fn(() => ({ single: singleUpdateMock }));
    const eqUpdateMock2 = mock.fn(() => ({ select: selectUpdateMock }));
    const eqUpdateMock1 = mock.fn(() => ({ eq: eqUpdateMock2 }));
    const updateMock = mock.fn(() => ({ eq: eqUpdateMock1 }));

    const selectMock = mock.fn(() => ({ eq: eqMock1 }));
    const fromMock = mock.fn((table: string) => {
      if (table === "memories") {
        return { select: selectMock, update: updateMock };
      }
      return {};
    });

    const mockSupabase = { from: fromMock } as unknown as SupabaseClient;
    mock.method(serverClient, "getSupabaseServerClient", async () => mockSupabase);

    // Assert getTimelineMemoryDetail
    const detail = await getTimelineMemoryDetail(userId, "mem-1");
    assert.ok(detail);
    assert.strictEqual(detail.id, "mem-1");
    assert.strictEqual(detail.summaryText, "Original memory text");
    assert.strictEqual(detail.noteText, "Original note");

    // Assert updateMemoryText
    const updatedDetail = await updateMemoryText(userId, "mem-1", "Updated text");
    assert.ok(updatedDetail);
    assert.strictEqual(updatedDetail.summaryText, "Updated text");

    // Ensure update was called on memories
    const updateCall = (updateMock as unknown as ReturnType<typeof mock.fn>).mock.calls[0];
    assert.ok(updateCall);
    assert.deepStrictEqual(updateCall.arguments[0], { summary_text: "Updated text" });
  });

  it("verifies a 1-tap deletion removes only the `memories` record", async () => {
    // 1. Setup mock for deleteMemory
    const eqDeleteMock2 = mock.fn(async () => ({ error: null }));
    const eqDeleteMock1 = mock.fn(() => ({ eq: eqDeleteMock2 }));
    const deleteMock = mock.fn(() => ({ eq: eqDeleteMock1 }));

    const fromMock = mock.fn((table: string) => {
      if (table === "memories") {
        return { delete: deleteMock };
      }
      return {};
    });

    const mockSupabase = { from: fromMock } as unknown as SupabaseClient;
    mock.method(serverClient, "getSupabaseServerClient", async () => mockSupabase);

    const result = await deleteMemory(userId, "mem-1");
    assert.strictEqual(result, true);

    // Assert delete was only called on memories table, not captures
    const fromCalls = (fromMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    assert.strictEqual(fromCalls.length, 1);
    assert.strictEqual(fromCalls[0].arguments[0], "memories");

    const eq1Call = (eqDeleteMock1 as unknown as ReturnType<typeof mock.fn>).mock.calls[0];
    assert.strictEqual(eq1Call.arguments[0], "id");
    assert.strictEqual(eq1Call.arguments[1], "mem-1");
  });

  it("verifies zero raw DB UUIDs, raw timestamps, or storage paths leak into client view models", async () => {
    const memory = {
      id: "mem-1", // We only allow our entity ids, assuming 'mem-1' is client-safe id
      user_id: "raw-uuid-user", // Should NOT leak
      capture_id: "cap-1",
      suggestion_id: "sug-1",
      summary_text: "Leak check",
      media_metadata_ref: null,
      created_at: "2023-10-24T10:00:00.000Z", // Raw timestamp should not leak directly as ISO string in display fields
      captures: { media_metadata: { storagePath: "raw/storage/path/photo.jpg" } },
      daily_suggestions: { primary_suggestion: "Take a walk" },
    };

    const limitMock = mock.fn(async () => ({ data: [memory], error: null }));
    const orderMock2 = mock.fn(() => ({ limit: limitMock }));
    const orderMock1 = mock.fn(() => ({ order: orderMock2 }));
    const eqMock = mock.fn(() => ({ order: orderMock1 }));
    const selectMock = mock.fn(() => ({ eq: eqMock }));
    const fromMock = mock.fn(() => ({ select: selectMock }));

    const mockSupabase = { from: fromMock } as unknown as SupabaseClient;
    mock.method(serverClient, "getSupabaseServerClient", async () => mockSupabase);

    const response = await getTimelineMemories(userId, { limit: 10 });

    assert.strictEqual(response.items.length, 1);
    const item = response.items[0];

    // Assert no leaks
    assert.strictEqual(((item as unknown) as Record<string, unknown>).user_id, undefined);
    assert.strictEqual(((item as unknown) as Record<string, unknown>).created_at, undefined);
    assert.strictEqual(((item as unknown) as Record<string, unknown>).media_metadata_ref, undefined);
    assert.strictEqual(((item as unknown) as Record<string, unknown>).captures, undefined);
    assert.strictEqual(((item as unknown) as Record<string, unknown>).daily_suggestions, undefined);
    assert.ok(String(((item as unknown) as Record<string, unknown>).photoUrl).startsWith("https://signed.url/")); // should be signed url

    // Assert cleanly formatted client data
    assert.strictEqual(item.displayDate, "Oct 24, 2023");
    assert.ok(item.displayTime.includes(":"));
    assert.strictEqual(item.photoUrl, "https://signed.url/raw/storage/path/photo.jpg");
  });
});
