import "server-only";

/**
 * Defines the structure of a companion personality profile used to modulate
 * the tone, style, and instructions in the AI prompt.
 */
export interface PersonalityProfile {
  tone: string;
  style: string;
  directives: string;
}

/**
 * Spontaneous companion profile:
 * Encouraging, light, novelty-seeking, adventurous, quick real-world action.
 */
const SPONTANEOUS_PROFILE: PersonalityProfile = {
  tone: "Encouraging, light, and adventurous.",
  style:
    "Focused on novelty, small fresh experiences, and quick real-world action without pressure.",
  directives:
    "- Highlight fresh experiences.\n- Encourage low-pressure, real-world action.\n- Keep suggestions light and adventurous.",
};

/**
 * Reflective companion profile:
 * Thoughtful, calm, grounding, observant, encouraging quiet appreciation.
 */
const REFLECTIVE_PROFILE: PersonalityProfile = {
  tone: "Thoughtful, calm, grounding, and observant.",
  style:
    "Encouraging quiet appreciation, gentle reflection, and mindful observation without demanding long journaling.",
  directives:
    "- Encourage mindful observation.\n- Guide gentle reflection.\n- Do not demand structured journaling.",
};

/**
 * Creative companion profile:
 * Imaginative, playful, fresh perspectives on everyday routines.
 */
const CREATIVE_PROFILE: PersonalityProfile = {
  tone: "Imaginative, playful, and curious.",
  style:
    "Offering fresh angles on ordinary routines and seeing everyday life with curiosity.",
  directives:
    "- Offer fresh perspectives on everyday routines.\n- Be playful and imaginative.\n- Spark curiosity.",
};

/**
 * A registry mapping string identifiers (vibes) to their corresponding PersonalityProfile.
 */
const PERSONALITY_REGISTRY: Record<string, PersonalityProfile> = {
  spontaneous: SPONTANEOUS_PROFILE,
  reflective: REFLECTIVE_PROFILE,
  creative: CREATIVE_PROFILE,
};

/**
 * Resolves a companion vibe string to its corresponding PersonalityProfile.
 * Performs a case-insensitive lookup. If the vibe is missing or unknown,
 * defaults to the SPONTANEOUS_PROFILE to ensure safe fallbacks.
 *
 * @param vibe - The requested companion vibe (e.g., "Reflective", "SPONTANEOUS").
 * @returns The resolved PersonalityProfile.
 */
export function resolvePersonality(vibe?: string | null): PersonalityProfile {
  if (!vibe) {
    return SPONTANEOUS_PROFILE;
  }

  const normalizedVibe = vibe.trim().toLowerCase();

  if (normalizedVibe in PERSONALITY_REGISTRY) {
    return PERSONALITY_REGISTRY[normalizedVibe];
  }

  return SPONTANEOUS_PROFILE;
}
