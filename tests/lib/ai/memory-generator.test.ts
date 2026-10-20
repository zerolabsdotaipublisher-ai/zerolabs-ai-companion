import "server-only";

import { test, describe, mock } from "node:test";
import assert from "node:assert";

import { generateMemorySummary } from "@/lib/ai/memory-generator";
import { GenerateMemorySummaryInput } from "@/lib/ai/types";

describe("generateMemorySummary", () => {
  const userId = "00000000-0000-0000-0000-000000000000";

  test("successfully generates summary for capture with note", async () => {
    const input: GenerateMemorySummaryInput = {
      noteText: "Saw a beautiful cardinal in the park today.",
    };

    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summaryText: "You saw a beautiful cardinal in the park today.",
              }),
            },
          },
        ],
      }),
    };

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => mockResponse as unknown as Response);

    const result = await generateMemorySummary(userId, input, {
      apiKey: "test-key",
    });

    assert.equal(
      result.summaryText,
      "You saw a beautiful cardinal in the park today.",
    );

    // Check that primary key/RLS is NOT in the prompt (as it only contains noteText/etc)
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock.fn>;
    const fetchCall = fetchMock.mock.calls[0];
    const fetchBody = JSON.parse(
      (fetchCall.arguments[1] as RequestInit).body as string,
    );
    const messages = fetchBody.messages;
    assert.ok(
      messages.some((m: { content: string }) =>
        m.content.includes("Saw a beautiful cardinal"),
      ),
    );
    assert.ok(
      !messages.some((m: { content: string }) => m.content.includes(userId)),
    );

    global.fetch = originalFetch;
  });

  test("handles timeout by returning fallback", async () => {
    const input: GenerateMemorySummaryInput = {
      noteText: "Saw a beautiful cardinal.",
    };

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => {
      const error = new Error("AbortError");
      error.name = "AbortError";
      throw error;
    });

    const result = await generateMemorySummary(userId, input, {
      apiKey: "test-key",
      timeoutMs: 10,
    });
    assert.equal(result.summaryText, "Noted: Saw a beautiful cardinal.");

    global.fetch = originalFetch;
  });

  test("handles 429 rate limit by returning fallback", async () => {
    const input: GenerateMemorySummaryInput = {
      suggestionTitle: "Go for a walk",
    };

    const mockResponse = {
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    };

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => mockResponse as unknown as Response);

    const result = await generateMemorySummary(userId, input, {
      apiKey: "test-key",
    });
    assert.equal(result.summaryText, "Engaged in: Go for a walk");

    global.fetch = originalFetch;
  });

  test("handles malformed JSON by returning fallback", async () => {
    const input: GenerateMemorySummaryInput = {
      mediaMetadata: { storagePath: "test.jpg" },
    };

    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "invalid json string",
            },
          },
        ],
      }),
    };

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => mockResponse as unknown as Response);

    const result = await generateMemorySummary(userId, input, {
      apiKey: "test-key",
    });
    assert.equal(result.summaryText, "Captured a moment today.");

    global.fetch = originalFetch;
  });

  test("handles empty capture properly with fallback", async () => {
    const input: GenerateMemorySummaryInput = {};

    const mockResponse = {
      ok: false, // force fallback for quick test
    };

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => mockResponse as unknown as Response);

    const result = await generateMemorySummary(userId, input, {
      apiKey: "test-key",
    });
    assert.equal(result.summaryText, "Recorded a quiet moment today.");

    global.fetch = originalFetch;
  });
});
