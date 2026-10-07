import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* eslint-disable @typescript-eslint/no-explicit-any */
let mockSupabase: any;

import * as serverClient from "../../../src/lib/supabase/server";

const mockGetSupabaseServerClient = mock.method(
  serverClient,
  "getSupabaseServerClient",
  async () => mockSupabase ?? ({} as any),
);

import {
  saveExperienceCapture,
  getUserCaptures,
  getCaptureById,
} from "../../../src/lib/ai/capture-db";

describe("Experience Capture Database Service", () => {
  beforeEach(() => {
    mockSupabase = {
      from: mock.fn(() => mockSupabase),
      insert: mock.fn(() => mockSupabase),
      select: mock.fn(() => mockSupabase),
      eq: mock.fn(() => mockSupabase),
      order: mock.fn(() => mockSupabase),
      limit: mock.fn(() => mockSupabase),
      single: mock.fn(),
    };
    mockGetSupabaseServerClient.mock.resetCalls();
  });

  describe("saveExperienceCapture", () => {
    it("successfully saves a suggestion-linked capture", async () => {
      const mockCaptureRow = {
        id: "capture-1",
        user_id: "user-1",
        suggestion_id: "suggestion-1",
        note_text: "I loved this activity!",
        media_metadata: null,
        created_at: "2023-10-27T10:00:00Z",
      };

      mockSupabase.single.mock.mockImplementationOnce(() => ({
        data: mockCaptureRow,
        error: null,
      }));

      const input = {
        suggestionId: "6fa36e8b-a459-42b7-87bb-b9b5f5431633", // must be valid uuid
        noteText: "I loved this activity!",
      };

      const result = await saveExperienceCapture("user-1", input);

      assert.deepStrictEqual(result, {
        noteText: "I loved this activity!",
        mediaMetadata: null,
      });

      // Verify the insert call didn't leak metadata to client model
      assert.strictEqual((result as any).id, undefined);
      assert.strictEqual((result as any).userId, undefined);
      assert.strictEqual((result as any).createdAt, undefined);
      assert.strictEqual((result as any).suggestionId, undefined);
    });

    it("successfully saves a spontaneous capture (no suggestionId)", async () => {
      const mockCaptureRow = {
        id: "capture-2",
        user_id: "user-1",
        suggestion_id: null,
        note_text: "Just felt like drawing",
        media_metadata: null,
        created_at: "2023-10-27T11:00:00Z",
      };

      mockSupabase.single.mock.mockImplementationOnce(() => ({
        data: mockCaptureRow,
        error: null,
      }));

      const input = {
        noteText: "Just felt like drawing",
      };

      const result = await saveExperienceCapture("user-1", input);

      assert.deepStrictEqual(result, {
        noteText: "Just felt like drawing",
        mediaMetadata: null,
      });
    });

    it("rejects input with overly long noteText", async () => {
      const longNote = "a".repeat(1001);
      const input = { noteText: longNote };

      await assert.rejects(
        saveExperienceCapture("user-1", input),
        (err: Error) =>
          /String must contain at most 1000 character|Too many characters|Expected string/i.test(
            err.message,
          ),
      );
    });

    it("throws error if userId is missing", async () => {
      await assert.rejects(
        saveExperienceCapture("", { noteText: "test" }),
        /userId is required/,
      );
    });

    it("throws error if supabase fails to insert", async () => {
      mockSupabase.single.mock.mockImplementationOnce(() => ({
        data: null,
        error: { message: "Database error" },
      }));

      const input = { noteText: "test" };

      await assert.rejects(
        saveExperienceCapture("user-1", input),
        /Failed to save experience capture: Database error/,
      );
    });
  });

  describe("getUserCaptures", () => {
    it("returns an array of sanitized captures", async () => {
      const mockRows = [
        {
          id: "capture-1",
          user_id: "user-1",
          suggestion_id: "suggestion-1",
          note_text: "note 1",
          media_metadata: null,
          created_at: "2023-10-27T10:00:00Z",
        },
        {
          id: "capture-2",
          user_id: "user-1",
          suggestion_id: null,
          note_text: "note 2",
          media_metadata: null,
          created_at: "2023-10-27T09:00:00Z",
        },
      ];

      mockSupabase.limit.mock.mockImplementationOnce(() => ({
        data: mockRows,
        error: null,
      }));

      const result = await getUserCaptures("user-1");

      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0], {
        noteText: "note 1",
        mediaMetadata: null,
      });
      assert.deepStrictEqual(result[1], {
        noteText: "note 2",
        mediaMetadata: null,
      });

      // Ensure zero metadata leaked
      assert.strictEqual((result[0] as any).id, undefined);
      assert.strictEqual((result[0] as any).user_id, undefined);
    });

    it("throws error if userId is missing", async () => {
      await assert.rejects(getUserCaptures(""), /userId is required/);
    });

    it("throws error if supabase fails to select", async () => {
      mockSupabase.limit.mock.mockImplementationOnce(() => ({
        data: null,
        error: { message: "Select error" },
      }));

      await assert.rejects(
        getUserCaptures("user-1"),
        /Failed to get experience captures: Select error/,
      );
    });
  });

  describe("getCaptureById", () => {
    it("returns a sanitized capture by ID", async () => {
      const mockRow = {
        id: "capture-1",
        user_id: "user-1",
        suggestion_id: "suggestion-1",
        note_text: "Specific note",
        media_metadata: null,
        created_at: "2023-10-27T10:00:00Z",
      };

      mockSupabase.single.mock.mockImplementationOnce(() => ({
        data: mockRow,
        error: null,
      }));

      const result = await getCaptureById("user-1", "capture-1");

      assert.notStrictEqual(result, null);
      assert.deepStrictEqual(result, {
        noteText: "Specific note",
        mediaMetadata: null,
      });
    });

    it("returns null if capture not found (PGRST116)", async () => {
      mockSupabase.single.mock.mockImplementationOnce(() => ({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      }));

      const result = await getCaptureById("user-1", "capture-1");

      assert.strictEqual(result, null);
    });

    it("throws error if supabase fails with other error", async () => {
      mockSupabase.single.mock.mockImplementationOnce(() => ({
        data: null,
        error: { message: "Some other error" },
      }));

      await assert.rejects(
        getCaptureById("user-1", "capture-1"),
        /Failed to get experience capture: Some other error/,
      );
    });

    it("throws error if userId is missing", async () => {
      await assert.rejects(
        getCaptureById("", "capture-1"),
        /userId is required/,
      );
    });

    it("throws error if captureId is missing", async () => {
      await assert.rejects(
        getCaptureById("user-1", ""),
        /captureId is required/,
      );
    });
  });
});

describe("Multi-tenant Data Boundaries (Integration)", () => {
  it("ensures getUserCaptures strictly limits scope to user_id param", async () => {
    const mockRows = [
      {
        id: "capture-1",
        user_id: "user-1",
        suggestion_id: "suggestion-1",
        note_text: "My note",
        media_metadata: null,
        created_at: "2023-10-27T10:00:00Z",
      },
    ];

    mockSupabase.eq.mock.mockImplementationOnce(() => ({
      order: mockSupabase.order,
    }));

    mockSupabase.limit.mock.mockImplementationOnce(() => ({
      data: mockRows,
      error: null,
    }));

    await getUserCaptures("user-1");

    const eqCalls = mockSupabase.eq.mock.calls;
    assert.ok(eqCalls.length > 0, "eq was not called");
    assert.strictEqual(eqCalls[0].arguments[0], "user_id");
    assert.strictEqual(eqCalls[0].arguments[1], "user-1");
  });
});
