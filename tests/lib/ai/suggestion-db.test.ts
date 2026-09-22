import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert";

import * as serverClient from "@/lib/supabase/server";
import * as logger from "@/lib/logger";

import {
  saveDailySuggestion,
  updateSuggestionStatus,
  getRecentDailySuggestions,
} from "@/lib/ai/suggestion-db";

const mockGetSupabaseServerClient = mock.method(
  serverClient,
  "getSupabaseServerClient",
  async () => ({}),
);

mock.method(logger.logger, "error", () => {});

describe("suggestion-db", () => {
  beforeEach(() => {
    mockGetSupabaseServerClient.mock.resetCalls();
  });

  describe("saveDailySuggestion", () => {
    it("should successfully save and return a sanitized suggestion", async () => {
      const mockSuggestionOutput = {
        primarySuggestion: "Take a walk",
        supportingContext: "It is sunny",
        alternatives: ["Read a book"],
        estimatedDuration: "15m",
        categoryTags: ["outdoor"],
      };

      const mockDbRow = {
        id: "sugg-123",
        user_id: "user-123",
        primary_suggestion: "Take a walk",
        supporting_context: "It is sunny",
        alternatives: ["Read a book"],
        estimated_duration: "15m",
        category_tags: ["outdoor"],
        status: "pending",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      };

      const mockSingle = mock.fn(async () => ({
        data: mockDbRow,
        error: null,
      }));

      const mockSelect = mock.fn(() => ({ single: mockSingle }));
      const mockInsert = mock.fn(() => ({ select: mockSelect }));
      const mockFrom = mock.fn(() => ({ insert: mockInsert }));

      mockGetSupabaseServerClient.mock.mockImplementation(async () => ({
        from: mockFrom,
      }));

      const result = await saveDailySuggestion(
        "user-123",
        mockSuggestionOutput,
      );

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
      assert.strictEqual(result.data.id, "sugg-123");
      assert.strictEqual(result.data.primarySuggestion, "Take a walk");
      assert.strictEqual(result.data.status, "pending");

      // Verify DB metadata leakage prevention
      assert.strictEqual("user_id" in result.data, false);
      assert.strictEqual("created_at" in result.data, false);
      assert.strictEqual("updated_at" in result.data, false);
      assert.strictEqual("userId" in result.data, false);
      assert.strictEqual("createdAt" in result.data, false);
    });

    it("should handle db error gracefully", async () => {
      const mockSingle = mock.fn(async () => ({
        data: null,
        error: { message: "DB constraint failed" },
      }));

      const mockSelect = mock.fn(() => ({ single: mockSingle }));
      const mockInsert = mock.fn(() => ({ select: mockSelect }));
      const mockFrom = mock.fn(() => ({ insert: mockInsert }));

      mockGetSupabaseServerClient.mock.mockImplementation(async () => ({
        from: mockFrom,
      }));

      const result = await saveDailySuggestion("user-123", {
        primarySuggestion: "Take a walk",
        supportingContext: "It is sunny",
        alternatives: ["Read a book"],
        estimatedDuration: "15m",
        categoryTags: ["outdoor"],
      });

      assert.strictEqual(result.data, null);
      assert.strictEqual(result.error, "DB constraint failed");
    });
  });

  describe("updateSuggestionStatus", () => {
    it("should update status and return sanitized output", async () => {
      const mockDbRow = {
        id: "sugg-123",
        user_id: "user-123",
        primary_suggestion: "Take a walk",
        supporting_context: "It is sunny",
        alternatives: ["Read a book"],
        estimated_duration: "15m",
        category_tags: ["outdoor"],
        status: "accepted",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      };

      const mockSingle = mock.fn(async () => ({
        data: mockDbRow,
        error: null,
      }));

      const mockEq2 = mock.fn(() => ({ select: mockSelect }));
      const mockEq1 = mock.fn(() => ({ eq: mockEq2 }));
      const mockSelect = mock.fn(() => ({ single: mockSingle }));
      const mockUpdate = mock.fn(() => ({ eq: mockEq1 }));
      const mockFrom = mock.fn(() => ({ update: mockUpdate }));

      mockGetSupabaseServerClient.mock.mockImplementation(async () => ({
        from: mockFrom,
      }));

      const result = await updateSuggestionStatus(
        "user-123",
        "sugg-123",
        "accepted",
      );

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
      assert.strictEqual(result.data.status, "accepted");
      assert.strictEqual("user_id" in result.data, false);
      assert.strictEqual("created_at" in result.data, false);
    });
  });

  describe("getRecentDailySuggestions", () => {
    it("should retrieve chronological history stripped of DB metadata", async () => {
      const mockRows = [
        {
          id: "sugg-1",
          user_id: "user-123",
          primary_suggestion: "Action 1",
          supporting_context: "Context 1",
          alternatives: [],
          estimated_duration: "15m",
          category_tags: [],
          status: "accepted",
          created_at: "2023-01-02T00:00:00Z",
          updated_at: "2023-01-02T00:00:00Z",
        },
        {
          id: "sugg-2",
          user_id: "user-123",
          primary_suggestion: "Action 2",
          supporting_context: "Context 2",
          alternatives: [],
          estimated_duration: "30m",
          category_tags: [],
          status: "skipped",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
      ];

      const mockLimit = mock.fn(async () => ({
        data: mockRows,
        error: null,
      }));
      const mockOrder = mock.fn(() => ({ limit: mockLimit }));
      const mockEq = mock.fn(() => ({ order: mockOrder }));
      const mockSelect = mock.fn(() => ({ eq: mockEq }));
      const mockFrom = mock.fn(() => ({ select: mockSelect }));

      mockGetSupabaseServerClient.mock.mockImplementation(async () => ({
        from: mockFrom,
      }));

      const result = await getRecentDailySuggestions("user-123", 2);

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
      assert.strictEqual(result.data.length, 2);
      assert.strictEqual(result.data[0].id, "sugg-1");
      assert.strictEqual(result.data[1].id, "sugg-2");

      assert.strictEqual("user_id" in result.data[0], false);
      assert.strictEqual("created_at" in result.data[0], false);

      const orderArgs = mockOrder.mock.calls[0].arguments as unknown as unknown[];
      assert.strictEqual(orderArgs[0], "created_at");
      assert.deepStrictEqual(orderArgs[1], { ascending: false });

      const limitArgs = mockLimit.mock.calls[0].arguments as unknown as unknown[];
      assert.strictEqual(limitArgs[0], 2);
    });
  });
});
