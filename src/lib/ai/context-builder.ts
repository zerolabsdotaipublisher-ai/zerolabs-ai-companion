import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const JsonObjectSchema = z.unknown().transform((val) => {
  if (typeof val === "object" && val !== null && !Array.isArray(val)) {
    return val as Record<string, unknown>;
  }
  return {};
});

const PreferencesSchema = z
  .object({
    companion_vibe: z.string().catch("Spontaneous"),
  })
  .catch({ companion_vibe: "Spontaneous" });

const ProfileDataSchema = z
  .object({
    display_name: z.string().nullable().optional().catch(null),
    preferred_name: z.string().nullable().optional().catch(null),
    personalization: JsonObjectSchema,
    preferences: JsonObjectSchema.pipe(PreferencesSchema),
  })
  .transform((val) => {
    const name = val.preferred_name || val.display_name || "Friend";
    return {
      display_name: name,
      companion_vibe: val.preferences.companion_vibe,
      personalization: val.personalization,
    };
  });

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

  // Parse the data defensively using Zod, defaulting safely on any failures
  // It also automatically strips out unmapped raw DB rows/fields if they happen to sneak in
  return ProfileDataSchema.parse(data);
}
