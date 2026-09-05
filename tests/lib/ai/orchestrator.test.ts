import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import Module from "node:module";

import "server-only";

const originalRequire = Module.prototype.require;

describe("processConversation", () => {
  let contextBuilderMock: {
    buildPromptContext: (userId: string) => Promise<unknown>;
  };
  let promptComposerMock: {
    composePrompt: (input: unknown) => unknown[];
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

    promptComposerMock = {
      composePrompt: (input: unknown) => {
        // Fallback mock behavior resembling composePrompt output
        // to not break other tests expecting providerReq.messages to match this
        const typedInput = input as { history?: unknown[]; activeMessage: unknown };
        return [...(typedInput.history || []), typedInput.activeMessage];
      },
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
      if (id.endsWith("prompt-composer")) {
        return promptComposerMock;
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
        key.includes("prompt-composer") ||
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

  it("calls buildPromptContext, composePrompt, and generateConversationResponse", async () => {
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

    let composerInput: unknown = null;
    promptComposerMock.composePrompt = (input: unknown) => {
      composerInput = input;
      return [
        { role: "system", content: "composed" },
        { role: "user", content: "Hello" },
      ];
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

    const castedComposerInput = composerInput as {
      context: unknown;
      history: unknown;
      activeMessage: unknown;
    };

    assert.deepEqual(castedComposerInput.context, {
      display_name: "TestUser",
      companion_vibe: "TestVibe",
      personalization: {},
    });
    assert.deepEqual(castedComposerInput.activeMessage, messages[0]);

    const castedReq = providerReq as {
      messages: unknown;
      settings: unknown;
    };

    // Orchestrator sends composed messages to provider
    assert.deepEqual(castedReq.messages, [
      { role: "system", content: "composed" },
      { role: "user", content: "Hello" },
    ]);
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

  it("passes correct history and context to composePrompt", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    const fakeHistory = [
      { id: "msg-1", role: "user", content: "Hi", created_at: "now" },
    ];

    dbServiceMock.getConversationMessages = async () => ({
      data: fakeHistory,
      error: null,
    });

    let composerInput: unknown = null;
    promptComposerMock.composePrompt = (input: unknown) => {
      composerInput = input;
      return [];
    };

    providerMock.generateConversationResponse = async () => {
      return { message: { role: "assistant", content: "TestResponse" } };
    };

    const messages = [{ role: "user" as const, content: "New prompt" }];

    await processConversation("user123", "conv123", messages);

    const castedComposerInput = composerInput as {
      history: unknown[];
      activeMessage: unknown;
    };

    assert.deepEqual(castedComposerInput.history, [
      { role: "user", content: "Hi" },
    ]);
    assert.deepEqual(castedComposerInput.activeMessage, {
      role: "user",
      content: "New prompt",
    });
  });

  it("handles errors from composePrompt", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    promptComposerMock.composePrompt = () => {
      throw new Error("Composer failed");
    };

    let loggedError: { msg: string; meta: unknown } | null = null;
    loggerMock.error = (msg: string, meta: unknown) => {
      loggedError = { msg, meta };
    };

    const result = await processConversation("user123", "conv123", [
      { role: "user", content: "Hi" },
    ]);

    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.equal(result.code, "INTERNAL_ERROR");
      assert.equal(
        result.message,
        "An unexpected error occurred while processing the conversation",
      );
      assert.deepEqual(result.details, { error: "Composer failed" });
    }

    assert.ok(loggedError !== null);
  });

  it("gracefully falls back to empty history if DB returns empty array or conversationId is null", async () => {
    const { processConversation } = await import("@/lib/ai/orchestrator");

    dbServiceMock.getConversationMessages = async () => ({
      data: [],
      error: null,
    });

    let providerReq: unknown = null;
    providerMock.generateConversationResponse = async (req: unknown) => {
      providerReq = req;
      return { message: { role: "assistant", content: "TestResponse" } };
    };

    const messages = [{ role: "user" as const, content: "New prompt" }];

    await processConversation("user123", "conv123", messages);

    const req1 = providerReq as { messages: Array<Record<string, unknown>> };
    assert.equal(req1.messages.length, 1);
    assert.deepEqual(req1.messages[0], { role: "user", content: "New prompt" });

    // Try with null conversationId
    providerReq = null;
    await processConversation("user123", null, messages);
    const req2 = providerReq as { messages: Array<Record<string, unknown>> };
    assert.equal(req2.messages.length, 1);
    assert.deepEqual(req2.messages[0], { role: "user", content: "New prompt" });
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

    const result = await processConversation("user123", null, [
      { role: "user", content: "Hi" },
    ]);

    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.equal(result.code, "RATE_LIMIT_EXCEEDED");
    }
  });
});
