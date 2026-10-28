import test, { mock } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_RUNTIME = "nodejs";

import {
  saveMemory,
  getUserMemories,
  getMemoryByCaptureId,
  updateMemoryText,
  deleteMemory,
  getMemoryById,
} from "@/lib/ai/memory-db";
import * as serverClient from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { CreateMemoryInput } from "@/lib/ai/types";

test("Memory DB Service Helpers", async (t) => {
  const userId = "user-123";
  const captureId = "00000000-0000-4000-8000-000000000001";
  const suggestionId = "00000000-0000-4000-8000-000000000002";

  const dbRow = {
    id: "mem-123",
    user_id: userId,
    capture_id: captureId,
    suggestion_id: suggestionId,
    summary_text: "Had a great time at the park.",
    media_metadata_ref: null,
    created_at: "2026-05-31T00:00:00Z",
    updated_at: "2026-05-31T00:00:00Z",
  };

  const validMemoryInput: CreateMemoryInput = {
    captureId,
    suggestionId,
    summaryText: "Had a great time at the park.",
    mediaMetadataRef: null,
  };

  await t.test(
    "saveMemory inserts new memory and strips internal metadata",
    async () => {
      const mockSupabase = {
        from: mock.fn(() => ({
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              eq: mock.fn(() => ({
                single: mock.fn(async () => ({
                  data: null,
                  error: { code: "PGRST116" },
                })),
              })),
            })),
          })),
          insert: mock.fn(() => ({
            select: mock.fn(() => ({
              single: mock.fn(async () => ({ data: dbRow, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const getClientMock = mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase,
      );

      const result = await saveMemory(userId, validMemoryInput);

      assert.equal(result.summaryText, dbRow.summary_text);
      assert.equal(result.mediaMetadataRef, null);
      // Explicitly check stripped keys
      assert.ok(!("id" in result));
      assert.ok(!("user_id" in result));
      assert.ok(!("created_at" in result));

      getClientMock.mock.restore();
    },
  );

  await t.test(
    "saveMemory handles idempotency (updates existing row on capture_id match)",
    async () => {
      const updatedDbRow = { ...dbRow, summary_text: "Updated summary text." };
      const updatedInput = {
        ...validMemoryInput,
        summaryText: "Updated summary text.",
      };

      const mockSupabase = {
        from: mock.fn(() => ({
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              eq: mock.fn(() => ({
                single: mock.fn(async () => ({ data: dbRow, error: null })),
              })),
            })),
          })),
          update: mock.fn(() => ({
            eq: mock.fn(() => ({
              select: mock.fn(() => ({
                single: mock.fn(async () => ({
                  data: updatedDbRow,
                  error: null,
                })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const getClientMock = mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase,
      );

      const result = await saveMemory(userId, updatedInput);

      assert.equal(result.summaryText, "Updated summary text.");
      getClientMock.mock.restore();
    },
  );

  await t.test(
    "getUserMemories returns memories mapped to ClientMemory",
    async () => {
      const mockSupabase = {
        from: mock.fn(() => ({
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              order: mock.fn(() => ({
                limit: mock.fn(async () => ({ data: [dbRow], error: null })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const getClientMock = mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase,
      );

      const results = await getUserMemories(userId, 10);

      assert.equal(results.length, 1);
      assert.equal(results[0].summaryText, dbRow.summary_text);
      assert.ok(!("id" in results[0]));

      getClientMock.mock.restore();
    },
  );

  await t.test(
    "getMemoryByCaptureId fetches a memory successfully",
    async () => {
      const mockSupabase = {
        from: mock.fn(() => ({
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              eq: mock.fn(() => ({
                single: mock.fn(async () => ({ data: dbRow, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const getClientMock = mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase,
      );

      const result = await getMemoryByCaptureId(userId, captureId);

      assert.ok(result);
      assert.equal(result.summaryText, dbRow.summary_text);

      getClientMock.mock.restore();
    },
  );

  await t.test(
    "getMemoryByCaptureId returns null gracefully if no memory exists",
    async () => {
      const mockSupabase = {
        from: mock.fn(() => ({
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              eq: mock.fn(() => ({
                single: mock.fn(async () => ({
                  data: null,
                  error: { code: "PGRST116" },
                })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const getClientMock = mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase,
      );

      const result = await getMemoryByCaptureId(userId, captureId);

      assert.equal(result, null);

      getClientMock.mock.restore();
    },
  );

  await t.test(
    "updateMemoryText throws on invalid summary length",
    async () => {
      await assert.rejects(
        async () => await updateMemoryText("user-1", "mem-1", ""),
        /Invalid summary text/,
      );
      await assert.rejects(
        async () => await updateMemoryText("user-1", "mem-1", "a".repeat(281)),
        /Invalid summary text/,
      );
    },
  );

  await t.test("updateMemoryText calls supabase update", async () => {
    const mockData = {
      id: "mem-1",
      user_id: "user-1",
      capture_id: "cap-1",
      suggestion_id: null,
      summary_text: "new text",
      media_metadata_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const eqMock2 = mock.fn(() => ({
      select: mock.fn(() => ({
        single: mock.fn(async () => ({
          data: mockData,
          error: null,
        })),
      })),
    }));
    const eqMock1 = mock.fn(() => ({
      eq: eqMock2,
    }));
    const updateMock = mock.fn(() => ({
      eq: eqMock1,
    }));
    const mockSupabase = {
      from: mock.fn(() => ({
        update: updateMock,
      })),
    } as unknown as SupabaseClient;

    const getClientMock = mock.method(
      serverClient,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const result = await updateMemoryText("user-1", "mem-1", "new text");
    assert.equal(result.summaryText, "new text");

    const updateCall = updateMock.mock.calls[0] as { arguments: unknown[] };
    assert.deepEqual(updateCall.arguments[0], {
      summary_text: "new text",
    });
    const eqCall1Params = eqMock1.mock.calls[0] as { arguments: unknown[] };
    assert.equal(eqCall1Params.arguments[0], "id");
    assert.equal(eqCall1Params.arguments[1], "mem-1");
    const eqCall2Params = eqMock2.mock.calls[0] as { arguments: unknown[] };
    assert.equal(eqCall2Params.arguments[0], "user_id");
    assert.equal(eqCall2Params.arguments[1], "user-1");

    getClientMock.mock.restore();
  });

  await t.test(
    "rejects cross-tenant operations via RLS simulation",
    async () => {
      // We already use mockSupabase which acts like an RLS enforced context since it passes auth.uid() properly.
      // However, to explicitly document it for tests:
      const mockSupabase = {
        from: mock.fn(() => ({
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              eq: mock.fn(() => ({
                single: mock.fn(async () => ({
                  data: null,
                  error: { code: "PGRST116" }, // Simulated RLS rejecting cross-tenant read
                })),
              })),
            })),
          })),
          delete: mock.fn(() => ({
            eq: mock.fn(() => ({
              eq: mock.fn(async () => ({
                error: { code: "403", message: "RLS violation" },
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const getClientMock = mock.method(
        serverClient,
        "getSupabaseServerClient",
        async () => mockSupabase,
      );

      const result = await getMemoryById("user-1", "mem-other-tenant");
      assert.equal(result, null);

      await assert.rejects(
        async () => await deleteMemory("user-1", "mem-other-tenant"),
        /Failed to delete memory/,
      );

      getClientMock.mock.restore();
    },
  );

  await t.test("deleteMemory calls supabase delete", async () => {
    const eqMock2 = mock.fn(async () => ({
      error: null,
    }));
    const eqMock1 = mock.fn(() => ({
      eq: eqMock2,
    }));
    const deleteMock = mock.fn(() => ({
      eq: eqMock1,
    }));
    const mockSupabase = {
      from: mock.fn(() => ({
        delete: deleteMock,
      })),
    } as unknown as SupabaseClient;

    const getClientMock = mock.method(
      serverClient,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const result = await deleteMemory("user-1", "mem-1");
    assert.equal(result, true);

    const eqCall1Params = eqMock1.mock.calls[0] as { arguments: unknown[] };
    assert.equal(eqCall1Params.arguments[0], "id");
    assert.equal(eqCall1Params.arguments[1], "mem-1");
    const eqCall2Params = eqMock2.mock.calls[0] as { arguments: unknown[] };
    assert.equal(eqCall2Params.arguments[0], "user_id");
    assert.equal(eqCall2Params.arguments[1], "user-1");

    getClientMock.mock.restore();
  });

  await t.test("getMemoryById fetches a specific memory by ID", async () => {
    const mockData = {
      id: "mem-1",
      user_id: "user-1",
      capture_id: "cap-1",
      suggestion_id: "sug-1",
      summary_text: "some text",
      media_metadata_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const singleMock = mock.fn(async () => ({
      data: mockData,
      error: null,
    }));
    const eqMock2 = mock.fn(() => ({
      single: singleMock,
    }));
    const eqMock1 = mock.fn(() => ({
      eq: eqMock2,
    }));
    const selectMock = mock.fn(() => ({
      eq: eqMock1,
    }));
    const mockSupabase = {
      from: mock.fn(() => ({
        select: selectMock,
      })),
    } as unknown as SupabaseClient;

    const getClientMock = mock.method(
      serverClient,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );

    const result = await getMemoryById("user-1", "mem-1");
    assert.ok(result);
    assert.equal(result?.id, "mem-1");
    assert.equal(result?.captureId, "cap-1");
    assert.equal(result?.suggestionId, "sug-1");
    assert.equal(result?.summaryText, "some text");

    getClientMock.mock.restore();
  });
});
