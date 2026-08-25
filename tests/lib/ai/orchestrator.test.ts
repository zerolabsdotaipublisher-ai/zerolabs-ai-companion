import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import Module from "node:module";

import "server-only";

const originalRequire = Module.prototype.require;

describe("processConversation", () => {
  let contextBuilderMock: {
    buildPromptContext: (userId: string) => Promise<unknown>;
  };
  let providerMock: {
    generateConversationResponse: (
      req: unknown,
      opts: unknown,
    ) => Promise<unknown>;
  };
  let dbServiceMock: {
    getConversationMessages: (
      id: string,
    ) => Promise<{ data: unknown[] | null; error: string | null }>;
  };
  let loggerMock: { error: (msg: string, meta?: unknown) => void };

  beforeEach(() => {
    contextBuilderMock = {
      buildPromptContext: async () => ({
        display_name: "MockName",
        companion_vibe: "MockVibe",
        personalization: { key: "value" },
      }),
    };

    dbServiceMock = {
      getConversationMessages: async () => ({
        data: [],
        error: null,
      }),
    };

    providerMock = {
      generateConversationResponse: async () => ({
        message: { role: "assistant", content: "Response" },
      }),
    };

    loggerMock = {
      error: () => {},
    };

    // Intercept requires
    (
      Module.prototype as unknown as {
        require: (id: string, ...args: unknown[]) => unknown;
      }
    ).require = function (id: string) {
      if (id.endsWith("context-builder")) {
        return contextBuilderMock;
      }
      if (id.endsWith("provider")) {
        return providerMock;
      }
      if (id.endsWith("db-service")) {
        return dbServiceMock;
      }
      if (id.endsWith("@/lib/logger")) {
        return { logger: loggerMock };
      }
      return originalRequire.apply(this, [id]);
    };

    // Need to clear cache to force require interception
    Object.keys(require.cache).forEach((key) => {
      if (
        key.includes("orchestrator") ||
        key.includes("context-builder") ||
        key.includes("provider") ||
        key.includes("db-service") ||
        key.includes("logger")
      ) {
        delete require.cache[key];
      }
    });
  });

  afterEach(() => {
    Module.prototype.require = originalRequire;
  });

  it("calls buildPromptContext and generateConversationResponse", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    let contextUserId = "";
    contextBuilderMock.buildPromptContext = async (userId: string) => {
      contextUserId = userId;
      return {
        display_name: "TestUser",
        companion_vibe: "TestVibe",
        personalization: {},
      };
    };

    let providerReq: unknown = null;
    let providerOpts: unknown = null;
    providerMock.generateConversationResponse = async (
      req: unknown,
      opts: unknown,
    ) => {
      providerReq = req;
      providerOpts = opts;
      return { message: { role: "assistant", content: "TestResponse" } };
    };

    const messages = [{ role: "user" as const, content: "Hello" }];
    const settings = { temperature: 0.5 };
    const options = { model: "test-model" };

    const result = await processConversation(
      "user123",
      "conv123",
      messages,
      settings,
      options,
    );

    assert.equal(contextUserId, "user123");

    const castedReq = providerReq as {
      context: unknown;
      messages: unknown;
      settings: unknown;
    };
    assert.deepEqual(castedReq.context, {
      display_name: "TestUser",
      companion_vibe: "TestVibe",
      personalization: {},
    });
    assert.deepEqual(castedReq.messages, messages);
    assert.deepEqual(castedReq.settings, settings);
    assert.deepEqual(providerOpts, options);

    assert.deepEqual(result, {
      message: { role: "assistant", content: "TestResponse" },
    });
  });

  it("handles errors from buildPromptContext", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    contextBuilderMock.buildPromptContext = async () => {
      throw new Error("Context failed");
    };

    let loggedError: { msg: string; meta: unknown } | null = null;
    loggerMock.error = (msg: string, meta: unknown) => {
      loggedError = { msg, meta };
    };

    const result = await processConversation("user123", null, []);

    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.equal(result.code, "INTERNAL_ERROR");
      assert.equal(
        result.message,
        "An unexpected error occurred while processing the conversation",
      );
      assert.deepEqual(result.details, { error: "Context failed" });
    }

    assert.ok(loggedError !== null);
    if (loggedError !== null) {
      const e = loggedError as { msg: string; meta: unknown };
      assert.equal(e.msg, "Unexpected error in processConversation");
      assert.equal(
        (e.meta as { error: Error }).error.message,
        "Context failed",
      );
    }
  });

  it("prepends conversation history from DB and correctly handles the 20 message slice and format", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    // Produce 25 messages in DB mock
    const fakeHistory = Array.from({ length: 25 }).map((_, i) => ({
      id: `msg-${i}`,
      role: "user",
      content: `History message ${i}`,
      created_at: `2023-10-10T10:00:${i.toString().padStart(2, "0")}Z`,
    }));

    dbServiceMock.getConversationMessages = async () => ({
      data: fakeHistory,
      error: null,
    });

    let providerReq: unknown = null;
    providerMock.generateConversationResponse = async (req: unknown) => {
      providerReq = req;
      return { message: { role: "assistant", content: "TestResponse" } };
    };

    const messages = [{ role: "user" as const, content: "New prompt" }];

    await processConversation("user123", "conv123", messages);

    // It should slice to the last 20 messages, and strip metadata
    const req = providerReq as { messages: Array<Record<string, unknown>> };
    const passedMessages = req.messages;
    assert.equal(passedMessages.length, 21); // 20 history + 1 new prompt

    // The first history message passed should be index 5 from fakeHistory
    assert.deepEqual(passedMessages[0], {
      role: "user",
      content: "History message 5",
    });

    // Verify it doesn't have metadata leaked
    assert.equal("id" in passedMessages[0], false);
    assert.equal("created_at" in passedMessages[0], false);

    // Last message should be the new prompt
    assert.deepEqual(passedMessages[20], {
      role: "user",
      content: "New prompt",
    });
  });

  it("returns generateConversationResponse result even if it's an error object", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    providerMock.generateConversationResponse = async () => {
      return {
        error: true,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit",
      };
    };

    const result = await processConversation("user123", null, []);

    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.equal(result.code, "RATE_LIMIT_EXCEEDED");
    }
  });
});
