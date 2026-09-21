import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "server-only";

import { buildSuggestionContext } from "@/lib/ai/suggestion-context";
import * as contextBuilder from "@/lib/ai/context-builder";

describe("Suggestion Context Builder", () => {
  const originalBuildPromptContext = contextBuilder.buildPromptContext;

  const mockBuildPromptContext = (returnValue: {
    display_name: string;
    companion_vibe: string;
    personalization: Record<string, unknown>;
  }) => {
    (
      contextBuilder as unknown as {
        buildPromptContext: (userId: string) => Promise<unknown>;
      }
    ).buildPromptContext = async () => returnValue;
  };

  const restoreMocks = () => {
    (
      contextBuilder as unknown as { buildPromptContext: unknown }
    ).buildPromptContext = originalBuildPromptContext;
  };

  it("merges user profile context properly", async () => {
    mockBuildPromptContext({
      display_name: "TestUser",
      companion_vibe: "Reflective",
      personalization: {},
    });

    const context = await buildSuggestionContext("user-1");

    assert.equal(context.profile.displayName, "TestUser");
    assert.equal(context.profile.companionVibe, "Reflective");

    restoreMocks();
  });

  it("provides graceful defaults when situational input is omitted or malformed", async () => {
    mockBuildPromptContext({
      display_name: "Friend",
      companion_vibe: "Spontaneous",
      personalization: {},
    });

    // Omitted
    let context = await buildSuggestionContext("user-1");
    assert.deepEqual(context.situational, {
      timeOfDay: "morning",
      environmentPreference: "flexible",
      durationWindow: "15m",
    });

    // Null
    context = await buildSuggestionContext("user-1", null);
    assert.deepEqual(context.situational, {
      timeOfDay: "morning",
      environmentPreference: "flexible",
      durationWindow: "15m",
    });

    // Malformed JSON (string)
    context = await buildSuggestionContext("user-1", "invalid");
    assert.deepEqual(context.situational, {
      timeOfDay: "morning",
      environmentPreference: "flexible",
      durationWindow: "15m",
    });

    // Malformed Object
    context = await buildSuggestionContext("user-1", {
      timeOfDay: "night", // Invalid
      environmentPreference: "space", // Invalid
      durationWindow: "10h", // Invalid
    });
    assert.deepEqual(context.situational, {
      timeOfDay: "morning",
      environmentPreference: "flexible",
      durationWindow: "15m",
    });

    // Partial Valid Object
    context = await buildSuggestionContext("user-1", {
      timeOfDay: "evening",
      environmentPreference: "space", // Invalid
    });
    assert.deepEqual(context.situational, {
      timeOfDay: "evening",
      environmentPreference: "flexible",
      durationWindow: "15m",
    });

    restoreMocks();
  });

  it("bounds and formats recent suggestions properly", async () => {
    mockBuildPromptContext({
      display_name: "Friend",
      companion_vibe: "Spontaneous",
      personalization: {},
    });

    const recentSuggestions = [
      { title: "Item 1" },
      { title: "Item 2", category: "mindful" },
      { invalid: "item" }, // Invalid item
      { title: "Item 3" },
      { title: "Item 4" },
      { title: "Item 5" },
      { title: "Item 6" }, // Should be sliced
    ];

    const context = await buildSuggestionContext(
      "user-1",
      undefined,
      recentSuggestions,
    );

    assert.equal(context.recentHistory.length, 5);
    assert.equal(context.recentHistory[0].title, "Item 1");
    assert.equal(context.recentHistory[1].title, "Item 2");
    assert.equal(context.recentHistory[1].category, "mindful");
    assert.equal(context.recentHistory[2].title, "Item 3");
    assert.equal(context.recentHistory[4].title, "Item 5");

    restoreMocks();
  });

  it("strictly ensures no raw database fields leak into the final payload", async () => {
    mockBuildPromptContext({
      display_name: "TestUser",
      companion_vibe: "Creative",
      personalization: {},
    });

    const maliciousInput = {
      timeOfDay: "afternoon",
      environmentPreference: "outdoor",
      durationWindow: "30m",
      id: "123",
      created_at: "2023-01-01T00:00:00Z",
    };

    const maliciousHistory = [
      { title: "Item 1", id: "555", user_id: "user-123" },
    ];

    const context = await buildSuggestionContext(
      "user-1",
      maliciousInput,
      maliciousHistory,
    );

    assert.strictEqual("id" in context.situational, false);
    assert.strictEqual("created_at" in context.situational, false);

    assert.equal(context.recentHistory.length, 1);
    assert.strictEqual("id" in context.recentHistory[0], false);
    assert.strictEqual("user_id" in context.recentHistory[0], false);

    restoreMocks();
  });
});
