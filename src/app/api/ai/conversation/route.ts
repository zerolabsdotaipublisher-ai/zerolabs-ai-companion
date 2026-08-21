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

  const { messages, settings } = validationResult.data;

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
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
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

import {
  getLatestConversation,
  getConversationMessages,
  getUserConversations,
} from "@/lib/ai/db-service";

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
