import "server-only";

import { logger } from "@/lib/logger";
import { DailySuggestionOutput, DailySuggestionOutputSchema } from "./types";
import { buildSuggestionContext } from "./suggestion-context";
import { resolvePersonality } from "./personalities";

const DEFAULT_MODEL = "gpt-4o-mini";
const API_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 15000;

export async function generateDailySuggestion(
  userId: string,
  situationalInput?: unknown,
  recentSuggestions?: unknown[],
  options?: {
    apiKey?: string;
    timeoutMs?: number;
    apiUrl?: string;
    model?: string;
  },
): Promise<DailySuggestionOutput> {
  const context = await buildSuggestionContext(
    userId,
    situationalInput,
    recentSuggestions,
  );

  const vibe = context.profile.companionVibe;
  const personality = resolvePersonality(vibe);

  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("OpenAI API key is missing. Using fallback suggestion.");
    return getFallbackSuggestion(vibe);
  }

  const timeoutMs = options?.timeoutMs || TIMEOUT_MS;
  const apiUrl = options?.apiUrl || API_URL;
  const model = options?.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const systemPrompt = `You are a helpful "Quiet Companion" AI. Your core identity is calm, supportive, minimalist, and suggestion-first. You strictly forbid productivity coaching, nagging, or mandatory journaling.
Your user's name is ${context.profile.displayName}. Your personality tone is: ${personality.tone}
Style: ${personality.style}
Directives:
${personality.directives}

Generate a daily suggestion for the user. It must be small, low-friction, real-world actions.
The user's current situation is: Time of Day: ${context.situational.timeOfDay}, Environment Preference: ${context.situational.environmentPreference}, Available Duration: ${context.situational.durationWindow}.
${
  context.recentHistory.length > 0
    ? `Recent suggestions (do not repeat these exact activities or categories if possible): ${JSON.stringify(
        context.recentHistory,
      )}`
    : ""
}

Return your response strictly as a JSON object matching this schema:
{
  "primarySuggestion": "Actionable activity title or text (max 255 chars)",
  "supportingContext": "Concise rationale explaining why this fits today (max 500 chars)",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "estimatedDuration": "15m/30m/1h/flex",
  "categoryTags": ["tag1", "tag2"]
}
`;

    const requestBody = {
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
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
      return getFallbackSuggestion(vibe);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      logger.error("Malformed response from AI provider: missing content");
      return getFallbackSuggestion(vibe);
    }

    const parsedJson = JSON.parse(content);
    const validated = DailySuggestionOutputSchema.safeParse(parsedJson);

    if (!validated.success) {
      logger.error(
        `Failed to parse OpenAI response as DailySuggestionOutput: ${validated.error.message}`,
      );
      return getFallbackSuggestion(vibe);
    }

    return validated.data;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      logger.error("OpenAI API request timed out");
    } else {
      logger.error("Error communicating with OpenAI", { error });
    }
    return getFallbackSuggestion(vibe);
  }
}

function getFallbackSuggestion(vibe: string): DailySuggestionOutput {
  const normalizedVibe = vibe.trim().toLowerCase();

  if (normalizedVibe === "reflective") {
    return {
      primarySuggestion: "Take a deep breath and observe your surroundings.",
      supportingContext:
        "A gentle moment of observation can ground you and set a calm tone for the rest of your day.",
      alternatives: [
        "Listen to a calming song with your eyes closed.",
        "Write down one simple thing you noticed today.",
      ],
      estimatedDuration: "flex",
      categoryTags: ["mindful", "grounding"],
    };
  }

  if (normalizedVibe === "creative") {
    return {
      primarySuggestion:
        "Look for a color you don't usually notice around you.",
      supportingContext:
        "Finding small, unusual details can spark a bit of playfulness in an ordinary moment.",
      alternatives: [
        "Doodle for a few minutes on a scrap piece of paper.",
        "Rearrange one small item on your desk or table.",
      ],
      estimatedDuration: "15m",
      categoryTags: ["playful", "creative"],
    };
  }

  // Spontaneous / Default fallback
  return {
    primarySuggestion: "Step outside for a quick breath of fresh air.",
    supportingContext:
      "A quick change of scenery is a great way to reset and refresh your energy.",
    alternatives: [
      "Do a quick, gentle stretch reaching for the ceiling.",
      "Drink a glass of water mindfully.",
    ],
    estimatedDuration: "15m",
    categoryTags: ["refresh", "movement"],
  };
}
