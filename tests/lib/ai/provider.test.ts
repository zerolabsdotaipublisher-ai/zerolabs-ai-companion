import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import "server-only";

import { generateConversationResponse } from "@/lib/ai/provider";
import { ConversationRequest, ConversationResponse } from "@/lib/ai/types";
import * as loggerModule from "@/lib/logger";

describe("generateConversationResponse", () => {
  let originalFetch: typeof global.fetch;
  let originalLoggerError: unknown;
  const originalEnv = process.env;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalLoggerError = loggerModule.logger.error;
    (loggerModule.logger as unknown as { error: () => void }).error = () => {};
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (loggerModule.logger as unknown as { error: unknown }).error =
      originalLoggerError;
    process.env = originalEnv;
  });

  const validRequest: ConversationRequest = {
    context: {
      display_name: "Alice",
      companion_vibe: "Supportive",
      personalization: { topic: "Science" },
    },
    messages: [
      { role: "user", content: "Hello" }
    ],
    settings: {
      temperature: 0.7,
    }
  };

  const validOptions = {
    apiKey: "override-key",
  };

  it("returns an error if API key is missing", async () => {
    process.env.OPENAI_API_KEY = "";
    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "INTERNAL_ERROR",
      message: "OpenAI API key is missing",
    });
  });

  it("sends a valid request and parses the successful response correctly", async () => {
    let fetchOptions: RequestInit | undefined;
    let url: URL | RequestInfo | undefined;

    global.fetch = async (input, init) => {
      url = input;
      fetchOptions = init;
      return new Response(JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        choices: [
          {
            message: { role: "assistant", content: "Hi Alice!" },
            finish_reason: "stop"
          }
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const response = await generateConversationResponse(validRequest, validOptions);

    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(fetchOptions?.method, "POST");
    assert.equal((fetchOptions?.headers as Record<string, string>)["Authorization"], "Bearer override-key");
    assert.equal((fetchOptions?.headers as Record<string, string>)["Content-Type"], "application/json");

    assert.ok(fetchOptions?.body);
    const body = JSON.parse(fetchOptions.body as string);
    assert.equal(body.model, "gpt-4o-mini");
    assert.equal(body.temperature, 0.7);
    assert.equal(body.messages.length, 2);
    assert.equal(body.messages[0].role, "system");
    assert.ok(body.messages[0].content.includes("Alice"));
    assert.ok(body.messages[0].content.includes("Supportive"));
    assert.ok(body.messages[0].content.includes("Science"));

    assert.strictEqual("error" in response, false);
    if (!("error" in response)) {
      const res = response as ConversationResponse;
      assert.equal(res.message.role, "assistant");
      assert.equal(res.message.content, "Hi Alice!");
      assert.equal(res.metadata?.model, "gpt-4o-mini-2024-07-18");
      assert.equal(res.metadata?.finish_reason, "stop");
      assert.equal(res.usage?.prompt_tokens, 10);
    }
  });

  it("handles AbortError as timeout", async () => {
    global.fetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "TIMEOUT",
      message: "OpenAI API request timed out",
    });
  });

  it("handles rate limit (429)", async () => {
    global.fetch = async () => {
      return new Response(null, { status: 429 });
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "RATE_LIMIT_EXCEEDED",
      message: "OpenAI rate limit exceeded",
    });
  });

  it("handles authentication failures (401/403)", async () => {
    global.fetch = async () => {
      return new Response(null, { status: 401 });
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "API_ERROR",
      message: "OpenAI API authentication failed",
    });
  });

  it("handles invalid requests (400)", async () => {
    global.fetch = async () => {
      return new Response(null, { status: 400, statusText: "Bad Request" });
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "INVALID_REQUEST",
      message: "OpenAI invalid request: Bad Request",
    });
  });

  it("handles JSON parsing errors", async () => {
    global.fetch = async () => {
      return new Response("Not valid json", { status: 200 });
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "INTERNAL_ERROR",
      message: "Failed to parse OpenAI response as JSON",
    });
  });

  it("handles malformed responses lacking choices/message", async () => {
    global.fetch = async () => {
      return new Response(JSON.stringify({ some_other_data: true }), { status: 200, headers: { "Content-Type": "application/json" }});
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "INTERNAL_ERROR",
      message: "Malformed response from AI provider: missing role or content",
    });
  });

  it("handles unhandled exception in fetch", async () => {
    global.fetch = async () => {
      throw new Error("Network offline");
    };

    const response = await generateConversationResponse(validRequest);

    assert.deepEqual(response, {
      error: true,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred while communicating with the AI provider",
      details: { error: "Network offline" }
    });
  });
});
