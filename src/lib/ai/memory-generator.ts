import "server-only";

import { logger } from "@/lib/logger";
import {
  MemorySummaryOutput,
  MemorySummaryOutputSchema,
  GenerateMemorySummaryInput,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const API_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 15000;

export async function generateMemorySummary(
  userId: string,
  capture: GenerateMemorySummaryInput,
  options?: {
    apiKey?: string;
    timeoutMs?: number;
    apiUrl?: string;
    model?: string;
  },
): Promise<MemorySummaryOutput> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("OpenAI API key is missing. Using fallback memory summary.");
    return getFallbackSummary(capture);
  }

  const timeoutMs = options?.timeoutMs || TIMEOUT_MS;
  const apiUrl = options?.apiUrl || API_URL;
  const model = options?.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const systemPrompt = `You are a helpful "Quiet Companion" AI. Your core identity is calm, supportive, minimalist, and non-preachy.
You strictly forbid productivity coaching, nagging, or mandatory journaling.
You will be given context from a user's experience capture.
Your task is to generate a concise, 1-line memory summary of the experience.
The summary must be exactly one sentence and strictly capped under 280 characters.
You must ground the summary strictly in the provided capture context (text, photo metadata, or linked activity).
You are strictly prohibited from inventing unstated facts, emotions, companions, weather, or locations.
Return your response strictly as a JSON object matching this schema:
{
  "summaryText": "Your 1-line memory summary here (max 280 chars)"
}`;

    const hasMedia = capture.mediaMetadata != null;
    const hasNote = capture.noteText != null && capture.noteText.trim() !== "";
    const hasSuggestion =
      capture.suggestionTitle != null && capture.suggestionTitle.trim() !== "";

    let captureContext = "Capture Context:\n";
    if (hasNote) {
      captureContext += `- Note text: "${capture.noteText}"\n`;
    }
    if (hasMedia) {
      captureContext += `- Media: User uploaded a photo/video\n`;
    }
    if (hasSuggestion) {
      captureContext += `- Linked Activity: User was doing "${capture.suggestionTitle}"\n`;
    }
    if (!hasNote && !hasMedia && !hasSuggestion) {
      captureContext += `- Empty capture: User submitted an empty form to record a quiet moment.\n`;
    }

    const requestBody = {
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: captureContext,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
      return getFallbackSummary(capture);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      logger.error("Malformed response from AI provider: missing content");
      return getFallbackSummary(capture);
    }

    const parsedJson = JSON.parse(content);
    const validated = MemorySummaryOutputSchema.safeParse(parsedJson);

    if (!validated.success) {
      logger.error(
        `Failed to parse OpenAI response as MemorySummaryOutput: ${validated.error.message}`,
      );
      return getFallbackSummary(capture);
    }

    return validated.data;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      logger.error("OpenAI API request timed out");
    } else {
      logger.error("Error communicating with OpenAI for memory generation", {
        error,
      });
    }
    return getFallbackSummary(capture);
  }
}

function getFallbackSummary(
  capture: GenerateMemorySummaryInput,
): MemorySummaryOutput {
  const hasNote = capture.noteText != null && capture.noteText.trim() !== "";
  const hasMedia = capture.mediaMetadata != null;
  const hasSuggestion =
    capture.suggestionTitle != null && capture.suggestionTitle.trim() !== "";

  if (hasNote) {
    const text = capture.noteText!.trim();
    const truncated = text.length > 250 ? text.substring(0, 250) + "..." : text;
    return { summaryText: `Noted: ${truncated}` };
  }

  if (hasSuggestion) {
    return { summaryText: `Engaged in: ${capture.suggestionTitle}` };
  }

  if (hasMedia) {
    return { summaryText: "Captured a moment today." };
  }

  return { summaryText: "Recorded a quiet moment today." };
}
