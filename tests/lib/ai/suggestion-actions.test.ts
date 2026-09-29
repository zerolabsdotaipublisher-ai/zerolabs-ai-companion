import { describe, test, beforeEach, mock, afterEach } from "node:test";
import assert from "node:assert";

import * as supabaseServerLib from "../../../src/lib/supabase/server";
import * as suggestionDbLib from "../../../src/lib/ai/suggestion-db";
import { POST } from "../../../src/app/api/ai/daily-suggestion/status/route";

describe("Daily Suggestion Status Route Handler", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  test("should return 401 if user is unauthorized", async () => {
    mock.method(supabaseServerLib, "getSupabaseServerClient", async () => ({
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: new Error("Unauthorized"),
        }),
      },
    }));

    const req = new Request("http://localhost/api/ai/daily-suggestion/status", {
      method: "POST",
      body: JSON.stringify({
        suggestionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "accepted",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.error, "Unauthorized");
  });

  test("should return 400 for invalid JSON payload", async () => {
    mock.method(supabaseServerLib, "getSupabaseServerClient", async () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    }));

    const req = new Request("http://localhost/api/ai/daily-suggestion/status", {
      method: "POST",
      body: "invalid-json",
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.error, "Invalid JSON");
  });

  test("should return 400 for invalid payload shape", async () => {
    mock.method(supabaseServerLib, "getSupabaseServerClient", async () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    }));

    const req = new Request("http://localhost/api/ai/daily-suggestion/status", {
      method: "POST",
      body: JSON.stringify({ suggestionId: "not-a-uuid", status: "accepted" }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.error, "Invalid payload");
  });

  test("should return 200 and updated suggestion on success", async () => {
    mock.method(supabaseServerLib, "getSupabaseServerClient", async () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    }));

    const suggestionId = "123e4567-e89b-12d3-a456-426614174000";
    const status = "skipped";

    const mockUpdatedSuggestion = {
      id: suggestionId,
      status,
      primarySuggestion: "Test",
    };

    mock.method(
      suggestionDbLib,
      "updateSuggestionStatus",
      async (uId: string, sId: string, stat: string) => {
        assert.strictEqual(uId, "user-123");
        assert.strictEqual(sId, suggestionId);
        assert.strictEqual(stat, status);
        return { data: mockUpdatedSuggestion, error: null };
      },
    );

    const req = new Request("http://localhost/api/ai/daily-suggestion/status", {
      method: "POST",
      body: JSON.stringify({ suggestionId, status }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.deepStrictEqual(json.data, mockUpdatedSuggestion);
  });

  test("should return 404 when suggestion is not found", async () => {
    mock.method(supabaseServerLib, "getSupabaseServerClient", async () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    }));

    mock.method(suggestionDbLib, "updateSuggestionStatus", async () => {
      return { data: null, error: "Not found" };
    });

    const req = new Request("http://localhost/api/ai/daily-suggestion/status", {
      method: "POST",
      body: JSON.stringify({
        suggestionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "accepted",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 404);
  });
});
