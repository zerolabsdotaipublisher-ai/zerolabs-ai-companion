import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import "server-only";

import { generateDailySuggestion } from "@/lib/ai/suggestion-generator";
import * as loggerModule from "@/lib/logger";

// Mock buildSuggestionContext from context-builder since it relies on DB fetching
import * as suggestionContextModule from "@/lib/ai/suggestion-context";

describe("generateDailySuggestion", () => {
  let originalFetch: typeof global.fetch;
  let originalLoggerError: unknown;
  const originalEnv = process.env;
  let originalBuildSuggestionContext: typeof suggestionContextModule.buildSuggestionContext;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalLoggerError = loggerModule.logger.error;
    (loggerModule.logger as unknown as { error: () => void }).error = () => {};
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };

    originalBuildSuggestionContext =
      suggestionContextModule.buildSuggestionContext;
    (
      suggestionContextModule as unknown as {
        buildSuggestionContext: typeof suggestionContextModule.buildSuggestionContext;
      }
    ).buildSuggestionContext = async () => ({
      profile: { displayName: "TestUser", companionVibe: "Spontaneous" },
      situational: {
        timeOfDay: "morning",
        environmentPreference: "flexible",
        durationWindow: "15m",
      },
      recentHistory: [],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (loggerModule.logger as unknown as { error: unknown }).error =
      originalLoggerError;
    process.env = originalEnv;
    (
      suggestionContextModule as unknown as {
        buildSuggestionContext: typeof suggestionContextModule.buildSuggestionContext;
      }
    ).buildSuggestionContext = originalBuildSuggestionContext;
  });

  const validSituationalInput = {
    timeOfDay: "afternoon",
    environmentPreference: "outdoor",
    durationWindow: "30m",
  };

  const validRecentSuggestions = [
    { title: "Read a book", category: "mindful" },
  ];

  it("returns fallback if API key is missing", async () => {
    process.env.OPENAI_API_KEY = "";

    (
      suggestionContextModule as unknown as {
        buildSuggestionContext: typeof suggestionContextModule.buildSuggestionContext;
      }
    ).buildSuggestionContext = async () => ({
      profile: { displayName: "TestUser", companionVibe: "Spontaneous" },
      situational: {
        timeOfDay: "morning",
        environmentPreference: "flexible",
        durationWindow: "15m",
      },
      recentHistory: [],
    });

    const suggestion = await generateDailySuggestion("user-1");

    assert.equal(
      suggestion.primarySuggestion,
      "Step outside for a quick breath of fresh air.",
    );
    assert.deepEqual(suggestion.categoryTags, ["refresh", "movement"]);
  });

  it("sends a valid request and parses the successful JSON response correctly", async () => {
    let fetchOptions: RequestInit | undefined;
    let url: URL | RequestInfo | undefined;

    global.fetch = async (input, init) => {
      url = input;
      fetchOptions = init;
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
    };

    const suggestion = await generateDailySuggestion(
      "user-1",
      validSituationalInput,
      validRecentSuggestions,
      { apiKey: "override-key" },
    );

    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(fetchOptions?.method, "POST");
    assert.equal(
      (fetchOptions?.headers as Record<string, string>)["Authorization"],
      "Bearer override-key",
    );

    assert.ok(fetchOptions?.body);
    const body = JSON.parse(fetchOptions.body as string);
    assert.equal(body.model, "gpt-4o-mini");
    assert.deepEqual(body.response_format, { type: "json_object" });

    const systemPrompt = body.messages[0].content;
    assert.ok(systemPrompt.includes("TestUser"));
    assert.ok(systemPrompt.includes("morning"));
    assert.ok(systemPrompt.includes("flexible"));

    assert.ok(
      !systemPrompt.includes("user-1"),
      "Should not leak raw DB user ID",
    );

    assert.equal(suggestion.primarySuggestion, "Go for a short walk.");
    assert.equal(suggestion.alternatives.length, 1);
    assert.equal(suggestion.categoryTags[0], "outdoor");
  });

  it("uses reflective fallback when fetch fails and vibe is reflective", async () => {
    (
      suggestionContextModule as unknown as {
        buildSuggestionContext: typeof suggestionContextModule.buildSuggestionContext;
      }
    ).buildSuggestionContext = async () => ({
      profile: { displayName: "TestUser", companionVibe: "Reflective" },
      situational: {
        timeOfDay: "morning",
        environmentPreference: "flexible",
        durationWindow: "15m",
      },
      recentHistory: [],
    });

    global.fetch = async () => {
      return new Response(null, { status: 500 });
    };

    const suggestion = await generateDailySuggestion("user-1");

    assert.equal(
      suggestion.primarySuggestion,
      "Take a deep breath and observe your surroundings.",
    );
    assert.deepEqual(suggestion.categoryTags, ["mindful", "grounding"]);
  });

  it("uses creative fallback when fetch timeout occurs and vibe is creative", async () => {
    (
      suggestionContextModule as unknown as {
        buildSuggestionContext: typeof suggestionContextModule.buildSuggestionContext;
      }
    ).buildSuggestionContext = async () => ({
      profile: { displayName: "TestUser", companionVibe: "Creative" },
      situational: {
        timeOfDay: "morning",
        environmentPreference: "flexible",
        durationWindow: "15m",
      },
      recentHistory: [],
    });

    let internalSignal: AbortSignal | undefined;
    global.fetch = async (input, init) => {
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
    };

    const suggestion = await generateDailySuggestion(
      "user-1",
      undefined,
      undefined,
      { timeoutMs: 1 },
    );

    assert.equal(
      suggestion.primarySuggestion,
      "Look for a color you don't usually notice around you.",
    );
    assert.deepEqual(suggestion.categoryTags, ["playful", "creative"]);
  });

  it("uses fallback on rate limit (429)", async () => {
    global.fetch = async () => {
      return new Response(null, { status: 429 });
    };

    const suggestion = await generateDailySuggestion("user-1");
    assert.equal(
      suggestion.primarySuggestion,
      "Step outside for a quick breath of fresh air.",
    );
  });

  it("uses fallback on invalid JSON response", async () => {
    global.fetch = async () => {
      return new Response("Not JSON", { status: 200 });
    };

    const suggestion = await generateDailySuggestion("user-1");
    assert.equal(
      suggestion.primarySuggestion,
      "Step outside for a quick breath of fresh air.",
    );
  });

  it("uses fallback when LLM returns invalid JSON missing required fields", async () => {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  some_field: "value",
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
    };

    const suggestion = await generateDailySuggestion("user-1");
    assert.equal(
      suggestion.primarySuggestion,
      "Step outside for a quick breath of fresh air.",
    );
  });
});
