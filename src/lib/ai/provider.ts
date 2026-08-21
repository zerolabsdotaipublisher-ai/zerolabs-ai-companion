import "server-only";

import { logger } from "@/lib/logger";
import {
  ConversationRequest,
  ConversationResponse,
  ConversationError,
  ConversationMessage,
  ConversationResponseSchema,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const API_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 15000;

export async function generateConversationResponse(
  request: ConversationRequest,
  options?: {
    apiKey?: string;
    timeoutMs?: number;
    apiUrl?: string;
    model?: string;
    stream?: boolean;
    abortSignal?: AbortSignal;
  },
): Promise<ConversationResponse | ConversationError | Response> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      error: true,
      code: "INTERNAL_ERROR",
      message: "OpenAI API key is missing",
    };
  }

  const timeoutMs = options?.timeoutMs || TIMEOUT_MS;
  const apiUrl = options?.apiUrl || API_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { context, messages, settings } = request;

    let systemContent = `You are a helpful AI companion. Your user's name is ${context.display_name}. Your personality/vibe is ${context.companion_vibe}.`;

    if (Object.keys(context.personalization).length > 0) {
      systemContent += ` User personalization: ${JSON.stringify(context.personalization)}`;
    }

    const systemPrompt: ConversationMessage = {
      role: "system",
      content: systemContent,
    };

    const apiMessages = [systemPrompt, ...messages];
    const model = options?.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;

    const requestBody = {
      model,
      messages: apiMessages,
      ...(options?.stream !== undefined && { stream: options.stream }),
      ...(settings?.temperature !== undefined && {
        temperature: settings.temperature,
      }),
      ...(settings?.max_tokens !== undefined && {
        max_tokens: settings.max_tokens,
      }),
      ...(settings?.top_p !== undefined && { top_p: settings.top_p }),
      ...(settings?.frequency_penalty !== undefined && {
        frequency_penalty: settings.frequency_penalty,
      }),
      ...(settings?.presence_penalty !== undefined && {
        presence_penalty: settings.presence_penalty,
      }),
    };

    if (options?.abortSignal) {
      options.abortSignal.addEventListener("abort", () => controller.abort());
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!options?.stream) {
      clearTimeout(timeoutId);
    }

    if (options?.stream && response.ok) {
      return response;
    }

    if (!response.ok) {
      if (response.status === 429) {
        return {
          error: true,
          code: "RATE_LIMIT_EXCEEDED",
          message: "OpenAI rate limit exceeded",
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          error: true,
          code: "API_ERROR",
          message: "OpenAI API authentication failed",
        };
      } else if (response.status >= 400 && response.status < 500) {
        return {
          error: true,
          code: "INVALID_REQUEST",
          message: `OpenAI invalid request: ${response.statusText}`,
        };
      } else {
        return {
          error: true,
          code: "API_ERROR",
          message: `OpenAI API error: ${response.status} ${response.statusText}`,
        };
      }
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return {
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to parse OpenAI response as JSON",
      };
    }

    const role = data.choices?.[0]?.message?.role;
    const content = data.choices?.[0]?.message?.content;

    if (!role || typeof content !== "string") {
      return {
        error: true,
        code: "INTERNAL_ERROR",
        message: "Malformed response from AI provider: missing role or content",
      };
    }

    const parsedData = {
      message: {
        role,
        content,
      },
      metadata: {
        model: data.model || model,
        finish_reason: data.choices?.[0]?.finish_reason,
      },
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
    };

    const validated = ConversationResponseSchema.safeParse(parsedData);
    if (!validated.success) {
      return {
        error: true,
        code: "INTERNAL_ERROR",
        message: "Malformed response from AI provider",
        details: { issues: validated.error.issues },
      };
    }

    return validated.data;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        error: true,
        code: "TIMEOUT",
        message: "OpenAI API request timed out",
      };
    }

    logger.error("Error communicating with OpenAI", { error });
    return {
      error: true,
      code: "INTERNAL_ERROR",
      message:
        "An unexpected error occurred while communicating with the AI provider",
      details: error instanceof Error ? { error: error.message } : undefined,
    };
  }
}
