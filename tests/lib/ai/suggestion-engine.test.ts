import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import "server-only";

import * as serverClient from "@/lib/supabase/server";
import * as logger from "@/lib/logger";

import { buildSuggestionContext } from "@/lib/ai/suggestion-context";
import { generateDailySuggestion } from "@/lib/ai/suggestion-generator";
import {
  saveDailySuggestion,
  updateSuggestionStatus,
  getRecentDailySuggestions,
} from "@/lib/ai/suggestion-db";

import * as contextBuilder from "@/lib/ai/context-builder";

// Mocks
const mockGetSupabaseServerClient = mock.method(
  serverClient,
  "getSupabaseServerClient",
  async () => ({}),
);

const originalLoggerError = logger.logger.error;
const originalFetch = global.fetch;
const originalEnv = process.env;

const originalBuildPromptContext = contextBuilder.buildPromptContext;

function createMockSupabaseClient() {
  const store = new Map<string, unknown>();

  return {
    from: (_table: string) => {
      let pendingUpdate: unknown = null;
      let filterId: string | null = null;
      let filterUserId: string | null = null;

      const builder: unknown = {
        insert: (row: unknown[]) => ({
          select: () => ({
            single: async () => {
              const record = {
                id: "sugg-123",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: "pending",
                ...(row[0] as Record<string, unknown>),
              };
              store.set(record.id, record);
              return { data: record, error: null };
            },
          }),
        }),
        update: (values: unknown) => {
          pendingUpdate = values;
          return builder;
        },
        eq: (col: string, val: string) => {
          if (col === "id") filterId = val;
          if (col === "user_id") filterUserId = val;
          return builder;
        },
        select: (_cols?: string) => builder,
        order: (_col: string, _opts?: unknown) => builder,
        limit: async (n: number) => {
          return { data: Array.from(store.values()).slice(0, n), error: null };
        },
        single: async () => {
          const record = filterId ? store.get(filterId) : null;
          if (
            !record ||
            (filterUserId &&
              (record as { user_id: string }).user_id !== filterUserId)
          ) {
            return {
              data: null,
              error: { message: "Row not found or access denied" },
            };
          }
          if (pendingUpdate) {
            Object.assign(record, pendingUpdate, {
              updated_at: new Date().toISOString(),
            });
          }
          return { data: record, error: null };
        },
      };

      return builder;
    },
  };
}

describe("Suggestion Engine End-to-End", () => {
  let mockClient: unknown;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    mockGetSupabaseServerClient.mock.mockImplementation(
      async () => mockClient as Record<string, unknown>,
    );

    global.fetch = mock.fn(async () => {
      return new Response(JSON.stringify({}), { status: 200 });
    });

    (logger.logger as unknown as { error: () => void }).error = () => {};
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };

    (
      contextBuilder as unknown as {
        buildPromptContext: (userId: string) => Promise<unknown>;
      }
    ).buildPromptContext = async () => ({
      display_name: "TestUser",
      companion_vibe: "Spontaneous",
      personalization: {},
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (logger.logger as unknown as { error: unknown }).error =
      originalLoggerError;
    process.env = originalEnv;

    (
      contextBuilder as unknown as { buildPromptContext: unknown }
    ).buildPromptContext = originalBuildPromptContext;
  });

  it("executes the deterministic AI failure recovery successfully", async () => {
    // Modify global fetch to throw a network timeout (or simulate 429)
    let internalSignal: AbortSignal | undefined;
    global.fetch = mock.fn(async (input, init) => {
      internalSignal = init?.signal as AbortSignal;
      return new Promise((_, reject) => {
        if (internalSignal) {
          internalSignal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    });

    const situationalInput = {
      timeOfDay: "afternoon",
      environmentPreference: "outdoor",
      durationWindow: "30m",
    };

    // Step 1: Build Context
    const context = await buildSuggestionContext("user-1", situationalInput);

    // Step 2: Generate Suggestion (should fail but resolve to fallback safely)
    const suggestion = await generateDailySuggestion(
      "user-1",
      context.situational,
      context.recentHistory,
      { timeoutMs: 1 }, // ensure very fast abort
    );

    // Because vibe is "Spontaneous" (see mock inside beforeEach)
    // Looking at generateDailySuggestion fallback for spontaneous:
    // It returns "Step outside for a quick breath of fresh air."
    // Let's assert the exact fallback it returns.
    assert.equal(
      suggestion.primarySuggestion,
      "Step outside for a quick breath of fresh air.",
    );

    // Step 3: Save Suggestion
    const savedResult = await saveDailySuggestion("user-1", suggestion);
    assert.equal(savedResult.error, null);
    assert.ok(savedResult.data);
    assert.equal(
      savedResult.data.primarySuggestion,
      suggestion.primarySuggestion,
    );
    assert.equal(savedResult.data.status, "pending");
  });

  it("prevents multi-tenant context leakage (isolation test)", async () => {
    // Attempting to update a suggestion belonging to another user.
    // In our createMockSupabaseClient, `.eq("user_id", ...)` acts as a filter.
    // So if updateSuggestionStatus passes the wrong user ID, it should return an error.

    const mockDbRow = {
      id: "sugg-456",
      user_id: "user-2", // the suggestion belongs to user-2
      primary_suggestion: "Go for a short walk.",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Inject row into store directly via a dummy insert or just manually relying on the mock
    const insertBuilder = (
      mockClient as {
        from: (table: string) => {
          insert: (row: unknown[]) => {
            select: () => { single: () => Promise<unknown> };
          };
        };
      }
    )
      .from("daily_suggestions")
      .insert([mockDbRow])
      .select();
    await insertBuilder.single(); // Actually insert it to store

    // User-1 tries to update User-2's suggestion
    const updateResult = await updateSuggestionStatus(
      "user-1",
      "sugg-456",
      "accepted",
    );

    assert.equal(updateResult.data, null);
    assert.equal(updateResult.error, "Row not found or access denied");
  });

  it("strictly ensures no raw database fields leak into final payload (boundary isolation test)", async () => {
    // Assert on the output of the full pipeline to ensure no DB IDs are present.
    const situationalInput = {
      timeOfDay: "afternoon",
      environmentPreference: "outdoor",
      durationWindow: "30m",
    };
    const suggestion = await generateDailySuggestion(
      "user-1",
      situationalInput,
      [],
      { timeoutMs: 1 },
    );
    const savedResult = await saveDailySuggestion("user-1", suggestion);

    assert.ok(savedResult.data);
    const data = savedResult.data as Record<string, unknown>;
    assert.strictEqual("user_id" in data, false);
    assert.strictEqual("created_at" in data, false);
    assert.strictEqual("updated_at" in data, false);
    // Explicitly test for the client-facing keys
    assert.ok(data.id);
    assert.ok(data.primarySuggestion);
  });

  it("executes the full end-to-end suggestion pipeline successfully", async () => {
    global.fetch = mock.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  primarySuggestion: "Go for a short walk.",
                  supportingContext:
                    "You said you prefer outdoor environments in the afternoon.",
                  alternatives: ["Do some light stretching."],
                  estimatedDuration: "30m",
                  categoryTags: ["outdoor", "exercise"],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const situationalInput = {
      timeOfDay: "afternoon",
      environmentPreference: "outdoor",
      durationWindow: "30m",
    };

    // Step 1: Build Context
    const context = await buildSuggestionContext("user-1", situationalInput);
    assert.equal(context.profile.displayName, "TestUser");

    // Step 2: Generate Suggestion
    const suggestion = await generateDailySuggestion(
      "user-1",
      context.situational,
      context.recentHistory,
    );
    assert.equal(suggestion.primarySuggestion, "Go for a short walk.");

    // Step 3: Save Suggestion
    const savedResult = await saveDailySuggestion("user-1", suggestion);
    assert.equal(savedResult.error, null);
    assert.ok(savedResult.data);
    assert.equal(savedResult.data.id, "sugg-123");
    assert.equal(savedResult.data.status, "pending");

    // Step 4: Update Status
    const updateResult = await updateSuggestionStatus(
      "user-1",
      savedResult.data.id,
      "accepted",
    );
    assert.equal(updateResult.error, null);
    assert.ok(updateResult.data);
    assert.equal(updateResult.data.status, "accepted");

    // Step 5: Get Recent Suggestions
    const recentResult = await getRecentDailySuggestions("user-1", 5);
    assert.equal(recentResult.error, null);
    assert.ok(recentResult.data);
    assert.equal(recentResult.data.length, 1);
    assert.equal(recentResult.data[0].status, "accepted");
  });
});
