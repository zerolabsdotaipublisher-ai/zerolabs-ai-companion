import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Mock server-only to avoid Next.js build errors during tests
import "server-only";

// Now import the module under test
import { buildPromptContext } from "@/lib/ai/context-builder";
// Mock Logger
import * as loggerModule from "@/lib/logger";
// Mock Supabase Server Client
import * as supabaseServer from "@/lib/supabase/server";

describe("Context Builder", () => {
  let originalGetSupabaseServerClient: unknown;
  let originalLoggerWarn: unknown;

  /**
   * Simple mock helper to mock supabase chain.
   * Allows returning specific data payloads to simulate database query results.
   */
  const mockSupabase = (returnValue: unknown) => {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => returnValue,
          }),
        }),
      }),
    };
  };

  it("returns default context when user is not found or error occurs", async () => {
    // Override logger to avoid cluttering test output
    originalLoggerWarn = loggerModule.logger.warn;
    (loggerModule.logger as unknown as { warn: () => void }).warn = () => {};

    // Override Supabase client
    originalGetSupabaseServerClient = supabaseServer.getSupabaseServerClient;
    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: null,
        error: new Error("Not found"),
      });

    const context = await buildPromptContext("user-1");

    assert.deepEqual(context, {
      display_name: "Friend",
      companion_vibe: "Spontaneous",
      personalization: {},
    });

    // Restore
    (loggerModule.logger as unknown as { warn: unknown }).warn =
      originalLoggerWarn;
    (
      supabaseServer as unknown as { getSupabaseServerClient: unknown }
    ).getSupabaseServerClient = originalGetSupabaseServerClient;
  });

  it("strips raw database fields and internal metadata from the context output", async () => {
    // Verifies that unmapped keys like IDs, timestamps, and metadata
    // are strictly excluded from the PromptContext object.
    originalGetSupabaseServerClient = supabaseServer.getSupabaseServerClient;
    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: "Sneaky User",
          preferred_name: "Sneaky",
          personalization: { key: "value" },
          preferences: { companion_vibe: "Reflective" },
          id: "123e4567-e89b-12d3-a456-426614174000",
          user_id: "user-123",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          internal_metadata: { secret: "do not leak" },
        },
        error: null,
      });

    const context = await buildPromptContext("user-5");

    assert.deepEqual(context, {
      display_name: "Sneaky",
      companion_vibe: "Reflective",
      personalization: { key: "value" },
    });

    // Explicitly verify the output does NOT contain injected keys
    assert.strictEqual("id" in context, false);
    assert.strictEqual("user_id" in context, false);
    assert.strictEqual("created_at" in context, false);
    assert.strictEqual("updated_at" in context, false);
    assert.strictEqual("internal_metadata" in context, false);

    (
      supabaseServer as unknown as { getSupabaseServerClient: unknown }
    ).getSupabaseServerClient = originalGetSupabaseServerClient;
  });

  it("translates normal user profiles successfully", async () => {
    // Valid profile payload maps correctly to context
    originalGetSupabaseServerClient = supabaseServer.getSupabaseServerClient;
    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: "John Doe",
          preferred_name: "Johnny",
          personalization: { key: "value" },
          preferences: { companion_vibe: "Reflective" },
        },
        error: null,
      });

    const context = await buildPromptContext("user-2");

    assert.deepEqual(context, {
      display_name: "Johnny", // Preferred name takes precedence
      companion_vibe: "Reflective",
      personalization: { key: "value" },
    });

    (
      supabaseServer as unknown as { getSupabaseServerClient: unknown }
    ).getSupabaseServerClient = originalGetSupabaseServerClient;
  });

  it("handles malformed JSON preferences defensively with defaults", async () => {
    originalGetSupabaseServerClient = supabaseServer.getSupabaseServerClient;
    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: "Alice",
          preferred_name: null,
          personalization: "invalid-json", // String instead of object
          preferences: [1, 2, 3], // Array instead of object
        },
        error: null,
      });

    const context = await buildPromptContext("user-3");

    assert.deepEqual(context, {
      display_name: "Alice",
      companion_vibe: "Spontaneous", // Fallback from z.catch
      personalization: {}, // Fallback for invalid personalization
    });

    (
      supabaseServer as unknown as { getSupabaseServerClient: unknown }
    ).getSupabaseServerClient = originalGetSupabaseServerClient;
  });

  it("handles primitive JSON preferences (string, number, boolean) defensively with defaults", async () => {
    originalGetSupabaseServerClient = supabaseServer.getSupabaseServerClient;
    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: "Bob",
          preferred_name: null,
          personalization: null,
          preferences: "some string instead of object",
        },
        error: null,
      });

    let context = await buildPromptContext("user-5");

    assert.deepEqual(context, {
      display_name: "Bob",
      companion_vibe: "Spontaneous",
      personalization: {},
    });

    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: "Charlie",
          preferred_name: null,
          personalization: null,
          preferences: 12345,
        },
        error: null,
      });

    context = await buildPromptContext("user-6");

    assert.deepEqual(context, {
      display_name: "Charlie",
      companion_vibe: "Spontaneous",
      personalization: {},
    });

    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: "Dave",
          preferred_name: null,
          personalization: null,
          preferences: true,
        },
        error: null,
      });

    context = await buildPromptContext("user-7");

    assert.deepEqual(context, {
      display_name: "Dave",
      companion_vibe: "Spontaneous",
      personalization: {},
    });

    (
      supabaseServer as unknown as { getSupabaseServerClient: unknown }
    ).getSupabaseServerClient = originalGetSupabaseServerClient;
  });

  it("handles missing (null/undefined) JSON preferences with defaults", async () => {
    // Null, undefined, or empty profile input returning default fallbacks
    originalGetSupabaseServerClient = supabaseServer.getSupabaseServerClient;
    (
      supabaseServer as unknown as {
        getSupabaseServerClient: () => Promise<unknown>;
      }
    ).getSupabaseServerClient = async () =>
      mockSupabase({
        data: {
          display_name: null,
          preferred_name: null,
          personalization: null,
          preferences: null,
        },
        error: null,
      });

    const context = await buildPromptContext("user-4");

    assert.deepEqual(context, {
      display_name: "Friend", // Fallback for name
      companion_vibe: "Spontaneous", // Fallback for preferences
      personalization: {}, // Fallback for personalization
    });

    (
      supabaseServer as unknown as { getSupabaseServerClient: unknown }
    ).getSupabaseServerClient = originalGetSupabaseServerClient;
  });
});
