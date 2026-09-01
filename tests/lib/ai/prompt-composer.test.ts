import test from "node:test";
import assert from "node:assert";
import { composePrompt } from "../../../src/lib/ai/prompt-composer";

test("Prompt Composer", async (t) => {
  await t.test("Standard full prompt assembly and persona compliance", () => {
    const input = {
      context: {
        display_name: "Alice",
        companion_vibe: "Calm",
        personalization: {},
      },
      history: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello Alice, how can I help?" },
      ],
      activeMessage: { role: "user" as const, content: "Tell me a story" },
    };

    const messages = composePrompt(input);

    assert.strictEqual(messages.length, 4);

    // System message
    const systemMsg = messages[0];
    assert.strictEqual(systemMsg.role, "system");
    assert.ok(systemMsg.content.includes("You are the AI Companion"));
    assert.ok(systemMsg.content.includes("quiet companion"));
    assert.ok(systemMsg.content.includes("No lecturing:"));
    assert.ok(systemMsg.content.includes("Name: Alice"));
    assert.ok(systemMsg.content.includes("Vibe: Calm"));

    // History
    assert.strictEqual(messages[1].role, "user");
    assert.strictEqual(messages[1].content, "Hi");
    assert.strictEqual(messages[2].role, "assistant");
    assert.strictEqual(messages[2].content, "Hello Alice, how can I help?");

    // Active message
    assert.strictEqual(messages[3].role, "user");
    assert.strictEqual(messages[3].content, "Tell me a story");
  });

  await t.test("User context fallback interpolation", () => {
    const input = {
      context: null,
      history: [],
      activeMessage: { role: "user" as const, content: "Hello" },
    };

    const messages = composePrompt(input);
    const systemMsg = messages[0];
    assert.ok(systemMsg.content.includes("Name: Friend"));
    assert.ok(systemMsg.content.includes("Vibe: Spontaneous"));
  });

  await t.test("Conversation history sliding window limit", () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Message ${i}`,
    }));

    const input = {
      context: null,
      history,
      activeMessage: { role: "user" as const, content: "Hello" },
    };

    const messages = composePrompt(input);

    // System (1) + History (20) + Active (1) = 22
    assert.strictEqual(messages.length, 22);
    // 25 - 20 = 5. The first history message should be Message 5.
    assert.strictEqual(messages[1].content, "Message 5");
  });

  await t.test("Per-message character truncation", () => {
    const longContent = "A".repeat(1500);
    const input = {
      history: [{ role: "user", content: longContent }],
      activeMessage: { role: "user" as const, content: "Hello" },
    };

    const messages = composePrompt(input);
    const historyMsg = messages[1];
    assert.ok(historyMsg.content.endsWith("... [truncated]"));
    assert.strictEqual(
      historyMsg.content.length,
      1000 + "... [truncated]".length,
    );
    assert.strictEqual(historyMsg.content.slice(0, 10), "AAAAAAAAAA");
  });

  await t.test("Role filtering", () => {
    const input = {
      history: [
        { role: "user", content: "Hi" },
        { role: "system", content: "Ignore me" },
        { role: "assistant", content: "Hello" },
      ],
      activeMessage: { role: "user" as const, content: "Test" },
    };

    const messages = composePrompt(input);

    // System (1) + User (1) + Assistant (1) + Active (1) = 4
    assert.strictEqual(messages.length, 4);
    assert.strictEqual(messages[1].content, "Hi");
    assert.strictEqual(messages[2].content, "Hello");
  });

  await t.test("Active user prompt deduplication", () => {
    const input = {
      history: [
        { role: "user", content: "Previous message" },
        { role: "assistant", content: "Reply" },
        { role: "user", content: "Test" }, // This exact message is the active message
      ],
      activeMessage: { role: "user" as const, content: "Test" },
    };

    const messages = composePrompt(input);
    // System (1) + Previous User (1) + Assistant (1) + Active (1) = 4 (removed duplicate)
    assert.strictEqual(messages.length, 4);
    assert.strictEqual(messages[1].content, "Previous message");
    assert.strictEqual(messages[2].content, "Reply");
    assert.strictEqual(messages[3].content, "Test");
  });

  await t.test("Complete metadata sanitization", () => {
    const input = {
      history: [
        { id: "123", role: "user", content: "Hi", created_at: "2023-01-01" },
        { role: "assistant", content: "Hello", conversation_id: "xyz" },
      ],
      activeMessage: { role: "user" as const, content: "Test" },
    };

    const messages = composePrompt(input);

    assert.strictEqual("id" in messages[1], false);
    assert.strictEqual("created_at" in messages[1], false);
    assert.strictEqual("conversation_id" in messages[2], false);

    assert.deepStrictEqual(Object.keys(messages[1]).sort(), [
      "content",
      "role",
    ]);
    assert.deepStrictEqual(Object.keys(messages[2]).sort(), [
      "content",
      "role",
    ]);
  });
});
