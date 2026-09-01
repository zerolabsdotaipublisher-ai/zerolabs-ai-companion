import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";

import * as originLib from "../../../src/lib/auth/origin";
import * as serverSessionLib from "../../../src/lib/auth/server-session";
import * as orchestratorLib from "../../../src/lib/ai/orchestrator";

// Mock the Next.js NextResponse
class MockNextResponse {
  body: unknown;
  status: number;
  headers: unknown;
  constructor(body: unknown, init?: { status?: number; headers?: unknown }) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.headers = init?.headers;
  }
  static json(body: unknown, init?: { status?: number }) {
    return {
      json: async () => body,
      status: init?.status ?? 200,
    };
  }
}

// Ensure the module is properly required
// eslint-disable-next-line @typescript-eslint/no-require-imports
const originalRequire = require("module").prototype.require;
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("module").prototype.require = function (path: string) {
  if (path === "next/server") {
    return { NextResponse: MockNextResponse };
  }
  return originalRequire.call(this, path);
};

import * as dbServiceLib from "../../../src/lib/ai/db-service";

// Import route after mocking
import { POST } from "../../../src/app/api/ai/conversation/route";

describe("POST /api/ai/conversation", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it("should return 403 if origin metadata is missing or not allowed", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => false);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 403);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
    assert.strictEqual(
      body.message,
      "Origin metadata is missing or not allowed.",
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({}));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => false);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 401);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
    assert.strictEqual(
      body.message,
      "You must be signed in to start a conversation.",
    );
  });

  it("should return 400 on invalid JSON payload", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: "{ invalid_json }",
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 400);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
    assert.strictEqual(body.message, "Invalid JSON payload.");
  });

  it("should return 400 on primitive JSON payloads", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: "123",
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 400);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
  });

  it("should return 400 on array JSON payloads", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: "[1, 2, 3]",
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 400);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
  });

  it("should return 400 on null JSON payloads", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: "null",
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 400);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
  });

  it("should return 400 on invalid schema payload", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({ messages: [] }), // Invalid because min(1)
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 400);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INVALID_REQUEST");
    assert.strictEqual(body.message, "Invalid conversation request.");
  });

  it("should handle error responses from processConversation", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    mock.method(orchestratorLib, "processConversation", async () => ({
      error: true,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Rate limit exceeded",
    }));

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 429);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "RATE_LIMIT_EXCEEDED");
  });

  it("should return 500 if outgoing response fails schema validation", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    mock.method(orchestratorLib, "processConversation", async () => ({
      message: { role: "invalid", content: "Hello" }, // Invalid role
    }));

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 500);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INTERNAL_ERROR");
    assert.strictEqual(
      body.message,
      "The AI produced an invalid response format.",
    );
  });

  it("should extract conversationId from request body and pass it to processConversation", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    const validResponse = {
      message: { role: "assistant", content: "Hi there!" },
      metadata: { model: "test-model" },
    };

    const processConversationMock = mock.method(
      orchestratorLib,
      "processConversation",
      async () => validResponse,
    );

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv-extracted-123",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 200);

    const callArgs = processConversationMock.mock.calls[0].arguments;
    assert.strictEqual(callArgs[0], "user1");
    assert.strictEqual(callArgs[1], "conv-extracted-123");
  });

  it("should return 200 and the valid response on success", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    const validResponse = {
      message: { role: "assistant", content: "Hi there!" },
      metadata: { model: "test-model" },
    };

    mock.method(
      orchestratorLib,
      "processConversation",
      async () => validResponse,
    );

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 200);

    const body = await response.json();
    assert.deepStrictEqual(body, validResponse);
  });

  it("should pass AbortController cancellation abortSignal to processConversation", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    let passedOptions = null as unknown as {
      stream?: boolean;
      abortSignal?: AbortSignal;
    } | null;
    mock.method(
      orchestratorLib,
      "processConversation",
      async (
        _userId: unknown,
        _conversationId: unknown,
        _messages: unknown,
        _settings: unknown,
        options: unknown,
      ) => {
        passedOptions = options as {
          stream?: boolean;
          abortSignal?: AbortSignal;
        };
        return { message: { role: "assistant", content: "Hi" } };
      },
    );

    const abortController = new AbortController();
    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hello" }],
      }),
      signal: abortController.signal,
    });

    await POST(request);

    assert.ok(passedOptions);
    assert.strictEqual(passedOptions ? passedOptions.stream : false, true);
    assert.ok(
      passedOptions ? passedOptions.abortSignal instanceof AbortSignal : false,
    );
  });

  it("should stream the response and save the assistant message on stream completion", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    const saveAssistantMessageMock = mock.method(
      dbServiceLib,
      "saveAssistantMessage",
      async () => ({
        data: { id: "msg2" },
        error: null,
      }),
    );

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'data: {"choices": [{"delta": {"content": "Hello"}}]}',
          ),
        );
        controller.enqueue(
          encoder.encode(
            '\n\ndata: {"choices": [{"delta": {"content": " world!"}}]}',
          ),
        );
        controller.enqueue(encoder.encode("\n\ndata: [DONE]\n\n"));
        controller.close();
      },
    });

    const mockResponse = new Response(mockStream, {
      status: 200,
      headers: new Headers({
        "Content-Type": "text/event-stream",
      }),
    });

    mock.method(
      orchestratorLib,
      "processConversation",
      async () => mockResponse,
    );

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = (await POST(request)) as unknown as Response;
    console.log("RESPONSE:", response);
    assert.strictEqual(response.status, 200);

    const reader = response.body?.getReader();
    assert.ok(reader);

    // Consume the stream to trigger flush
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    assert.strictEqual(saveAssistantMessageMock.mock.callCount(), 1);
    const saveCall = saveAssistantMessageMock.mock.calls[0];
    assert.strictEqual(saveCall.arguments[0], "conv1");
    assert.strictEqual(saveCall.arguments[1], "user1");
    assert.strictEqual(saveCall.arguments[2], "Hello world!");
  });

  it("should return 500 and a structured ConversationError if an unexpected exception is thrown", async () => {
    mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
    mock.method(serverSessionLib, "getServerAuthState", async () => ({
      user: { id: "user1" },
    }));
    mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

    mock.method(dbServiceLib, "saveUserMessage", async () => ({
      data: { id: "msg1" },
      error: null,
    }));

    mock.method(orchestratorLib, "processConversation", async () => {
      throw new Error("Simulated runtime crash");
    });

    const request = new Request("https://example.com/api/ai/conversation", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conv1",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = (await POST(request)) as unknown as {
      status: number;
      json: () => Promise<Record<string, unknown>>;
    };
    assert.strictEqual(response.status, 500);

    const body = await response.json();
    assert.strictEqual(body.error, true);
    assert.strictEqual(body.code, "INTERNAL_ERROR");
    assert.strictEqual(
      body.message,
      "An unexpected error occurred while processing your request.",
    );
  });
});

it("should prevent multi-tenant context leakage by gracefully handling unauthorized DB read", async () => {
  mock.method(originLib, "isStateChangingAuthRequestAllowed", () => true);
  mock.method(serverSessionLib, "getServerAuthState", async () => ({
    user: { id: "user2" }, // Different user
  }));
  mock.method(serverSessionLib, "hasAuthenticatedServerSession", () => true);

  // Simulate RLS blocking read and returning empty array
  mock.method(dbServiceLib, "getConversationMessages", async () => ({
    data: [],
    error: null,
  }));

  mock.method(dbServiceLib, "saveUserMessage", async () => ({
    data: { id: "msg1" },
    error: null,
  }));

  let providerReq: Record<string, unknown> | null = null;
  mock.method(
    orchestratorLib,
    "processConversation",
    async (_userId: unknown, _conversationId: unknown, messages: unknown) => {
      providerReq = { messages };
      return { message: { role: "assistant", content: "Hi" } };
    },
  );

  const request = new Request("https://example.com/api/ai/conversation", {
    method: "POST",
    body: JSON.stringify({
      conversationId: "conv-owned-by-user1",
      messages: [{ role: "user", content: "Hello" }],
    }),
  });

  const response = (await POST(request)) as unknown as Response;
  assert.strictEqual(response.status, 200);

  const passedMessages = (providerReq as unknown as Record<string, unknown>)
    ?.messages as unknown[];
  assert.strictEqual(passedMessages.length, 1);
  assert.deepStrictEqual(passedMessages[0], { role: "user", content: "Hello" });
});
