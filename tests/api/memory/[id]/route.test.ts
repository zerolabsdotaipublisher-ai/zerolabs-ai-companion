import "server-only";

import { test, describe, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

import { PATCH, DELETE } from "@/app/api/memory/[id]/route";
import { POST } from "@/app/api/memory/[id]/regenerate/route";
import * as serverClient from "@/lib/supabase/server";
import * as memoryDb from "@/lib/ai/memory-db";
import * as memoryGenerator from "@/lib/ai/memory-generator";
import * as captureDb from "@/lib/ai/capture-db";
import * as suggestionDb from "@/lib/ai/suggestion-db";

describe("Memory API Routes", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: mock.fn(async () => ({
          data: { user: { id: "user-123" } },
          error: null,
        })),
      },
    };
    mock.method(
      serverClient,
      "getSupabaseServerClient",
      async () => mockSupabase,
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("PATCH /api/memory/[id]", () => {
    test("rejects unauthorized users (RLS simulation)", async () => {
      mockSupabase.auth.getUser = mock.fn(async () => ({
        data: { user: null },
        error: new Error("Unauthorized"),
      }));

      const req = new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ summaryText: "test" }),
      });
      const params = Promise.resolve({ id: "mem-1" });

      const res = await PATCH(req, { params });
      assert.equal(res.status, 401);
    });

    test("updates memory text via updateMemoryText (source preservation)", async () => {
      const updatedMemory = { summaryText: "A new summary." };
      const updateMock = mock.method(
        memoryDb,
        "updateMemoryText",
        async () => updatedMemory,
      );

      const req = new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ summaryText: "A new summary." }),
      });
      const params = Promise.resolve({ id: "mem-1" });

      const res = await PATCH(req, { params });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.deepEqual(data.memory, updatedMemory);

      const callArgs = updateMock.mock.calls[0].arguments;
      assert.equal(callArgs[0], "user-123");
      assert.equal(callArgs[1], "mem-1");
      assert.equal(callArgs[2], "A new summary.");
    });
  });

  describe("DELETE /api/memory/[id]", () => {
    test("deletes memory via deleteMemory keeping capture intact (source preservation)", async () => {
      const deleteMock = mock.method(
        memoryDb,
        "deleteMemory",
        async () => true,
      );

      const req = new Request("http://localhost", { method: "DELETE" });
      const params = Promise.resolve({ id: "mem-1" });

      const res = await DELETE(req, { params });
      assert.equal(res.status, 200);

      const callArgs = deleteMock.mock.calls[0].arguments;
      assert.equal(callArgs[0], "user-123");
      assert.equal(callArgs[1], "mem-1");
    });
  });

  describe("POST /api/memory/[id]/regenerate", () => {
    test("fetches full context, regenerates memory and saves it", async () => {
      mock.method(memoryDb, "getMemoryById", async () => ({
        id: "mem-1",
        captureId: "cap-1",
        suggestionId: "sug-1",
      }));
      mock.method(captureDb, "getCaptureById", async () => ({
        noteText: "My quick note.",
        mediaMetadata: null,
      }));
      mock.method(
        suggestionDb,
        "getSuggestionById",
        async () => ({
          primarySuggestion: "Go for a run",
        }),
      );

      const genMock = mock.method(
        memoryGenerator,
        "generateMemorySummary",
        async () => ({
          summaryText: "A fresh new generated summary.",
        }),
      );

      const updateMock = mock.method(
        memoryDb,
        "updateMemoryText",
        async () => ({
          summaryText: "A fresh new generated summary.",
        }),
      );

      const req = new Request("http://localhost", { method: "POST" });
      const params = Promise.resolve({ id: "mem-1" });

      const res = await POST(req, { params });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.memory.summaryText, "A fresh new generated summary.");

      // Verify the generated context included everything
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const genArgs = genMock.mock.calls[0].arguments[1] as any;
      assert.equal(genArgs.noteText, "My quick note.");
      assert.equal(genArgs.suggestionTitle, "Go for a run");

      const updateArgs = updateMock.mock.calls[0].arguments;
      assert.equal(updateArgs[0], "user-123");
      assert.equal(updateArgs[1], "mem-1");
      assert.equal(updateArgs[2], "A fresh new generated summary.");
    });
  });
});
