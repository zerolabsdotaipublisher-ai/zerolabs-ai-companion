import { NextResponse } from "next/server";
import {
  getServerAuthState,
  hasAuthenticatedServerSession,
} from "@/lib/auth/server-session";
import { isStateChangingAuthRequestAllowed } from "@/lib/auth/origin";
import { processConversation } from "@/lib/ai/orchestrator";
import { ConversationInputSchema } from "@/lib/ai/validation";
import { ConversationResponseSchema, ConversationError } from "@/lib/ai/types";
import { logger } from "@/lib/logger";
import {
  createConversation,
  saveUserMessage,
  getLatestConversation,
  getConversationMessages,
  getUserConversations,
  saveAssistantMessage,
} from "@/lib/ai/db-service";

export async function POST(request: Request): Promise<Response> {
  // Check if it's an allowed origin to prevent CSRF on state-changing API routes
  if (!isStateChangingAuthRequestAllowed(request)) {
    const error: ConversationError = {
      error: true,
      code: "INVALID_REQUEST",
      message: "Origin metadata is missing or not allowed.",
    };
    return NextResponse.json(error, { status: 403 });
  }

  const authState = await getServerAuthState();

  if (!hasAuthenticatedServerSession(authState)) {
    const error: ConversationError = {
      error: true,
      code: "INVALID_REQUEST",
      message: "You must be signed in to start a conversation.",
    };
    return NextResponse.json(error, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    const error: ConversationError = {
      error: true,
      code: "INVALID_REQUEST",
      message: "Invalid JSON payload.",
    };
    return NextResponse.json(error, { status: 400 });
  }

  const validationResult = ConversationInputSchema.safeParse(parsedBody);
  if (!validationResult.success) {
    const error: ConversationError = {
      error: true,
      code: "INVALID_REQUEST",
      message: "Invalid conversation request.",
      details: { errors: validationResult.error.flatten().fieldErrors },
    };
    return NextResponse.json(error, { status: 400 });
  }

  const { conversationId, messages, settings } = validationResult.data;

  let resolvedConversationId = conversationId;

  if (!resolvedConversationId) {
    const { data: newConversation, error: createError } =
      await createConversation(authState.user.id);

    if (createError || !newConversation) {
      const error: ConversationError = {
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to create a new conversation.",
      };
      return NextResponse.json(error, { status: 500 });
    }
    resolvedConversationId = newConversation.id;
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === "user") {
    const { error: saveError } = await saveUserMessage(
      resolvedConversationId,
      authState.user.id,
      lastMessage.content,
    );
    if (saveError) {
      logger.error("Failed to save user message", { error: saveError });
      // We can choose to fail the request or continue. We'll fail it to ensure consistency.
      const error: ConversationError = {
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to save user message.",
      };
      return NextResponse.json(error, { status: 500 });
    }
  }

  try {
    const response = await processConversation(
      authState.user.id,
      messages,
      settings,
      {
        stream: true,
        abortSignal: request.signal,
      },
    );

    if (response instanceof Response) {
      // Return the newly created/existing conversation ID in headers
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache, no-transform");
      headers.set("Connection", "keep-alive");
      headers.set("x-conversation-id", resolvedConversationId);
      headers.set("Access-Control-Expose-Headers", "x-conversation-id");

      if (!response.body) {
        return new NextResponse(null, { status: response.status, headers });
      }

      // Stream accumulator
      let assistantMessageContent = "";
      const decoder = new TextDecoder();
      let buffer = "";

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          // Pass the chunk through to the client
          controller.enqueue(chunk);

          // Accumulate and parse chunks on the server to save the final message
          const decodedChunk = decoder.decode(chunk, { stream: true });
          buffer += decodedChunk;
          const lines = buffer.split("\n");

          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const dataString = trimmedLine.slice("data: ".length);
              if (dataString === "[DONE]") {
                continue;
              }
              try {
                const parsed = JSON.parse(dataString);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessageContent += content;
                }
              } catch {
                // Ignore parsing errors for incomplete JSON
              }
            }
          }
        },
        async flush() {
          if (assistantMessageContent) {
            await saveAssistantMessage(
              resolvedConversationId,
              authState.user.id,
              assistantMessageContent,
            );
          }
        },
      });

      return new NextResponse(response.body.pipeThrough(transformStream), {
        status: response.status,
        headers,
      });
    }

    // Check if the response is already an error response from the orchestrator
    if ("error" in response && response.error === true) {
      // Return 500 for orchestrator/provider errors if not specifically a 400
      const status =
        response.code === "INVALID_REQUEST"
          ? 400
          : response.code === "RATE_LIMIT_EXCEEDED"
            ? 429
            : 500;
      return NextResponse.json(response, { status });
    }

    // Validate the outgoing response
    const outputValidation = ConversationResponseSchema.safeParse(response);
    if (!outputValidation.success) {
      logger.error("Invalid outgoing conversation response", {
        context: "ai",
        source: "api.ai.conversation",
        metadata: { userId: authState.user.id },
        error: outputValidation.error,
      });

      const error: ConversationError = {
        error: true,
        code: "INTERNAL_ERROR",
        message: "The AI produced an invalid response format.",
      };
      return NextResponse.json(error, { status: 500 });
    }

    return NextResponse.json(outputValidation.data);
  } catch (caughtError) {
    logger.error("Unexpected error in conversation route", {
      context: "ai",
      source: "api.ai.conversation",
      metadata: { userId: authState.user.id },
      error: caughtError,
    });

    const error: ConversationError = {
      error: true,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred while processing your request.",
    };
    return NextResponse.json(error, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  const authState = await getServerAuthState();

  if (!hasAuthenticatedServerSession(authState)) {
    const error: ConversationError = {
      error: true,
      code: "INVALID_REQUEST",
      message: "You must be signed in to access conversation history.",
    };
    return NextResponse.json(error, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationIdParam = searchParams.get("conversationId");
  const listParam = searchParams.get("list");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  try {
    if (listParam === "true") {
      const { data: conversations, error: listError } =
        await getUserConversations(authState.user.id);

      if (listError) {
        throw new Error(listError);
      }

      return NextResponse.json(
        { conversations: conversations || [] },
        { status: 200 },
      );
    }

    let conversationId = conversationIdParam;

    if (!conversationId) {
      const { data: latestConversation, error: latestError } =
        await getLatestConversation(authState.user.id);
      if (latestError) {
        throw new Error(latestError);
      }
      if (!latestConversation) {
        return NextResponse.json(
          { conversationId: null, messages: [] },
          { status: 200 },
        );
      }
      conversationId = latestConversation.id;
    }

    const { data: messages, error: messagesError } =
      await getConversationMessages(conversationId, limit, offset);

    if (messagesError) {
      throw new Error(messagesError);
    }

    // Map database messages to ConversationMessage format
    const formattedMessages = (messages || []).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    return NextResponse.json({ conversationId, messages: formattedMessages });
  } catch (caughtError) {
    logger.error("Unexpected error fetching conversation history", {
      context: "ai",
      source: "api.ai.conversation.history",
      metadata: { userId: authState.user.id },
      error: caughtError,
    });

    const error: ConversationError = {
      error: true,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred while retrieving history.",
    };
    return NextResponse.json(error, { status: 500 });
  }
}
