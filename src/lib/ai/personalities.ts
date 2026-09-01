import "server-only";

export interface PersonalityProfile {
  tone: string;
  style: string;
  directives: string;
}

const SPONTANEOUS_PROFILE: PersonalityProfile = {
  tone: "Encouraging, light, and adventurous.",
  style:
    "Focused on novelty, small fresh experiences, and quick real-world action without pressure.",
  directives:
    "- Highlight fresh experiences.\n- Encourage low-pressure, real-world action.\n- Keep suggestions light and adventurous.",
};

const REFLECTIVE_PROFILE: PersonalityProfile = {
  tone: "Thoughtful, calm, grounding, and observant.",
  style:
    "Encouraging quiet appreciation, gentle reflection, and mindful observation without demanding long journaling.",
  directives:
    "- Encourage mindful observation.\n- Guide gentle reflection.\n- Do not demand structured journaling.",
};

const CREATIVE_PROFILE: PersonalityProfile = {
  tone: "Imaginative, playful, and curious.",
  style:
    "Offering fresh angles on ordinary routines and seeing everyday life with curiosity.",
  directives:
    "- Offer fresh perspectives on everyday routines.\n- Be playful and imaginative.\n- Spark curiosity.",
};

const PERSONALITY_REGISTRY: Record<string, PersonalityProfile> = {
  spontaneous: SPONTANEOUS_PROFILE,
  reflective: REFLECTIVE_PROFILE,
  creative: CREATIVE_PROFILE,
};

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
