import "server-only";

import { z } from "zod";

import { buildPromptContext } from "./context-builder";

export const SituationalContextInputSchema = z
  .object({
    timeOfDay: z.enum(["morning", "afternoon", "evening"]).catch("morning"),
    environmentPreference: z
      .enum(["indoor", "outdoor", "flexible"])
      .catch("flexible"),
    durationWindow: z.enum(["15m", "30m", "1h"]).catch("15m"),
  })
  .catch({
    timeOfDay: "morning",
    environmentPreference: "flexible",
    durationWindow: "15m",
  });

export type SituationalContextInput = z.infer<
  typeof SituationalContextInputSchema
>;

export const SuggestionHistoryItemSchema = z.object({
  title: z.string(),
  category: z.string().optional(),
});

export type SuggestionHistoryItem = z.infer<typeof SuggestionHistoryItemSchema>;

const RecentSuggestionsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((items) => {
    return items
      .map((item) => {
        const parsed = SuggestionHistoryItemSchema.safeParse(item);
        return parsed.success ? parsed.data : null;
      })
      .filter((item): item is SuggestionHistoryItem => item !== null)
      .slice(0, 5);
  });

export type SuggestionContextPayload = {
  profile: {
    displayName: string;
    companionVibe: string;
  };
  situational: SituationalContextInput;
  recentHistory: SuggestionHistoryItem[];
};

export async function buildSuggestionContext(
  userId: string,
  situationalInput?: unknown,
  recentSuggestions?: unknown[],
): Promise<SuggestionContextPayload> {
  const promptContext = await buildPromptContext(userId);

  const situational = SituationalContextInputSchema.parse(
    situationalInput ?? {},
  );
  const recentHistory = RecentSuggestionsSchema.parse(recentSuggestions ?? []);

  return {
    profile: {
      displayName: promptContext.display_name,
      companionVibe: promptContext.companion_vibe,
    },
    situational,
    recentHistory,
  };
}
