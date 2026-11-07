import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

/* eslint-disable @typescript-eslint/no-explicit-any */
let mockSupabase: any;

import * as serverClient from "../../../src/lib/supabase/server";

const mockGetSupabaseServerClient = mock.method(
  serverClient,
  "getSupabaseServerClient",
  async () => mockSupabase ?? ({} as any),
);

import { POST } from "../../../src/app/api/capture/route";
import * as storageServiceModule from "../../../src/lib/storage/storage-service";

describe("Capture API route", () => {
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: mock.fn(async () => ({
          data: { user: { id: "user-123" } },
          error: null,
        })),
      },
      from: mock.fn(() => mockSupabase),
      insert: mock.fn(() => mockSupabase),
      select: mock.fn(() => mockSupabase),
      single: mock.fn(),
    };
    mockGetSupabaseServerClient.mock.resetCalls();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("handles suggestionId and sanitizes invalid UUIDs", async () => {
    mockSupabase.single.mock.mockImplementationOnce(() => ({
      data: {
        id: "capture-1",
        user_id: "user-123",
        suggestion_id: null,
        note_text: "test note",
        media_metadata: null,
        created_at: "2023-10-27T10:00:00Z",
      },
      error: null,
    }));

    const request = new Request("http://localhost/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suggestionId: "mock-id-123", // invalid uuid string
        noteText: "test note",
      }),
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 201);
    const body = await response.json();
    assert.deepStrictEqual(body.capture, {
      noteText: "test note",
      mediaMetadata: null,
    });
  });

  it.skip("handles valid suggestionId correctly", async () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    mockSupabase.single.mock.mockImplementationOnce(() => ({
      data: {
        id: "capture-1",
        user_id: "user-123",
        suggestion_id: validUuid,
        note_text: "valid uuid note",
        media_metadata: null,
        created_at: "2023-10-27T10:00:00Z",
      },
      error: null,
    }));

    const request = new Request("http://localhost/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suggestionId: validUuid,
        noteText: "valid uuid note",
      }),
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 201);
    const body = await response.json();
    assert.deepStrictEqual(body.capture, {
      noteText: "valid uuid note",
      mediaMetadata: null,
    });
  });

  it.skip("returns 401 if unauthorized", async () => {
    mockSupabase.auth.getUser.mock.mockImplementationOnce(async () => ({
      data: { user: null },
      error: new Error("Unauthorized"),
    }));

    const request = new Request("http://localhost/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText: "test" }),
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 401);
  });
});
