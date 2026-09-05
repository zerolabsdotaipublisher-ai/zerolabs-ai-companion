import "server-only";

import { buildPromptContext } from "./context-builder";
import { composePrompt } from "./prompt-composer";
import { generateConversationResponse } from "./provider";
import { getConversationMessages } from "./db-service";
import {
  ConversationMessage,
  ConversationModelSettings,
  ConversationResponse,
  ConversationError,
} from "./types";
import { logger } from "@/lib/logger";

/**
 * Orchestrates an AI conversation request by assembling the user's context
 * and invoking the AI provider.
 *
 * @param userId - The ID of the user initiating the conversation
 * @param conversationId - The optional ID of the conversation to retrieve history for
 * @param messages - The history of messages in the conversation
 * @param settings - Optional AI model settings
 * @param options - Optional configuration for the AI provider
 * @returns {Promise<ConversationResponse | ConversationError>} The AI's response or an error
 */
export async function processConversation(
  userId: string,
  conversationId: string | null | undefined,
  messages: ConversationMessage[],
  settings?: ConversationModelSettings,
  options?: {
    apiKey?: string;
    timeoutMs?: number;
    apiUrl?: string;
    model?: string;
    stream?: boolean;
    abortSignal?: AbortSignal;
  },
): Promise<ConversationResponse | ConversationError | Response> {
  try {
    const context = await buildPromptContext(userId);

    let history: ConversationMessage[] = [];

    if (conversationId) {
      const historyResult = await getConversationMessages(conversationId);
      if (historyResult.error) {
        logger.error("Failed to retrieve conversation history", {
          context: "ai",
          source: "ai.orchestrator",
          error: historyResult.error,
          metadata: { userId, conversationId },
        });
        // Non-blocking error, we continue with empty history
      } else if (historyResult.data) {
        // Enforce a sliding history window capped strictly at the last 20 messages
        // chronological sorting (created_at ASC) is already done by getConversationMessages
        const recentMessages = historyResult.data.slice(-20);

        // Defensively filter and map retrieved rows to clean role objects
        history = recentMessages
          .filter((msg) => msg.role === "user" || msg.role === "assistant")
          .map((msg) => {
            let content = msg.content;
            if (content.length > 1000) {
              content = content.substring(0, 1000) + "... [truncated]";
            }
            return {
              role: msg.role as "user" | "assistant",
              content,
            };
          });

        // Duplicate Prevention is handled by composePrompt
      }
    }

    // We expect the active message to be the last one in the messages array
    const activeMessage = messages[messages.length - 1];
    if (!activeMessage) {
      throw new Error("No active message provided in conversation request.");
    }

    const composedMessages = composePrompt({
      context,
      history,
      activeMessage,
    });

    const request = {
      conversationId: conversationId || undefined,
      context,
      messages: composedMessages,
      settings,
    };

    return await generateConversationResponse(request, options);
  } catch (error: unknown) {
    logger.error("Unexpected error in processConversation", {
      context: "ai",
      source: "ai.orchestrator",
      error,
      metadata: { userId },
    });

    return {
      error: true,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred while processing the conversation",
      details: error instanceof Error ? { error: error.message } : undefined,
    };
  }
}
