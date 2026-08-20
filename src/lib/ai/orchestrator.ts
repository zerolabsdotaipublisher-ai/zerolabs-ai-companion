import 'server-only';

import { buildPromptContext } from "./context-builder";
import { generateConversationResponse } from "./provider";
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
 * @param messages - The history of messages in the conversation
 * @param settings - Optional AI model settings
 * @param options - Optional configuration for the AI provider
 * @returns {Promise<ConversationResponse | ConversationError>} The AI's response or an error
 */
export async function processConversation(
  userId: string,
  messages: ConversationMessage[],
  settings?: ConversationModelSettings,
  options?: { apiKey?: string; timeoutMs?: number; apiUrl?: string; model?: string; stream?: boolean; abortSignal?: AbortSignal }
): Promise<ConversationResponse | ConversationError | Response> {
  try {
    const context = await buildPromptContext(userId);

    const request = {
      context,
      messages,
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
