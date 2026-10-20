import test, { mock } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_RUNTIME = "nodejs";

import {
  saveMemory,
  getUserMemories,
  getMemoryByCaptureId,
} from "@/lib/ai/memory-db";
import * as serverClient from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { CreateMemoryInput } from "@/lib/ai/types";

test("Memory DB Service Helpers", async (t) => {
  const userId = "user-123";
  const captureId = "00000000-0000-0000-0000-000000000001";
  const suggestionId = "00000000-0000-0000-0000-000000000002";

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
});
