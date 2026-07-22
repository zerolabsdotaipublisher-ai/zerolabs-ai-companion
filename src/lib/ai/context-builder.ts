import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PreferencesSchema = z
  .object({
    companion_vibe: z.string().catch("Spontaneous"),
  })
  .catch({ companion_vibe: "Spontaneous" });

export type PromptContext = {
  display_name: string;
  companion_vibe: string;
  personalization: Record<string, unknown>;
};

export async function buildPromptContext(
  userId: string,
): Promise<PromptContext> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("identity_profiles")
    .select("display_name, preferred_name, personalization, preferences")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    if (error) {
      logger.warn("Context Builder failed to load identity profile", {
        context: "ai",
        source: "ai.context-builder",
        error,
        metadata: { userId },
      });
    }

    return {
      display_name: "Friend",
      companion_vibe: "Spontaneous",
      personalization: {},
    };
  }

  const name = data.preferred_name || data.display_name || "Friend";

  const prefs = PreferencesSchema.parse(
    typeof data.preferences === "object" &&
      data.preferences !== null &&
      !Array.isArray(data.preferences)
      ? data.preferences
      : {},
  );

  const personalization =
    typeof data.personalization === "object" &&
    data.personalization !== null &&
    !Array.isArray(data.personalization)
      ? data.personalization
      : {};

  return {
    display_name: name,
    companion_vibe: prefs.companion_vibe,
    personalization,
  };
}
