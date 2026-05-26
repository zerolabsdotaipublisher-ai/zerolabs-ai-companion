import type { IdentityProfileJson } from "@/lib/identity/types";

export const COMPANION_PREFERENCES_KEY = "companion_preferences";

export const COMPANION_TONE_OPTIONS = ["calm", "friendly", "playful", "direct"] as const;
export const SUGGESTION_STYLE_OPTIONS = [
  "balanced",
  "novel",
  "familiar",
  "outdoor",
  "indoor",
] as const;
export const ACTIVITY_INTENSITY_OPTIONS = ["light", "moderate", "active"] as const;
export const PREFERRED_TIME_OF_DAY_OPTIONS = [
  "morning",
  "afternoon",
  "evening",
  "anytime",
] as const;
export const LOCATION_PREFERENCE_OPTIONS = [
  "nearby",
  "local_area",
  "anywhere",
] as const;

export type CompanionTone = (typeof COMPANION_TONE_OPTIONS)[number];
export type SuggestionStyle = (typeof SUGGESTION_STYLE_OPTIONS)[number];
export type ActivityIntensity = (typeof ACTIVITY_INTENSITY_OPTIONS)[number];
export type PreferredTimeOfDay = (typeof PREFERRED_TIME_OF_DAY_OPTIONS)[number];
export type LocationPreference = (typeof LOCATION_PREFERENCE_OPTIONS)[number];

export type CompanionPreferences = {
  companion_tone: CompanionTone;
  suggestion_style: SuggestionStyle;
  activity_intensity: ActivityIntensity;
  preferred_time_of_day: PreferredTimeOfDay;
  location_preference: LocationPreference;
  interests: string[];
  avoidances: string[];
  ai_context: Record<string, IdentityProfileJson>;
};

export type CompanionPreferencesUpdateInput = Partial<CompanionPreferences>;
export type CompanionPreferencesValidationErrors = Partial<
  Record<keyof CompanionPreferences, string>
>;

export type CompanionPreferenceContext = {
  tone: CompanionTone;
  suggestionStyle: SuggestionStyle;
  activityIntensity: ActivityIntensity;
  preferredTimeOfDay: PreferredTimeOfDay;
  locationPreference: LocationPreference;
  interests: string[];
  avoidances: string[];
};

export const DEFAULT_COMPANION_PREFERENCES: CompanionPreferences = {
  companion_tone: "calm",
  suggestion_style: "balanced",
  activity_intensity: "light",
  preferred_time_of_day: "anytime",
  location_preference: "nearby",
  interests: [],
  avoidances: [],
  ai_context: {},
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isAllowedOption<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function cloneCompanionPreferences(
  preferences: CompanionPreferences,
): CompanionPreferences {
  return {
    ...preferences,
    interests: [...preferences.interests],
    avoidances: [...preferences.avoidances],
    ai_context: { ...preferences.ai_context },
  };
}

export function createDefaultCompanionPreferences(): CompanionPreferences {
  return cloneCompanionPreferences(DEFAULT_COMPANION_PREFERENCES);
}

export function normalizeCompanionPreferenceList(
  values: readonly string[],
): string[] {
  const seenValues = new Set<string>();
  const normalizedValues: string[] = [];

  for (const value of values) {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      continue;
    }

    const dedupeKey = normalizedValue.toLocaleLowerCase();

    if (seenValues.has(dedupeKey)) {
      continue;
    }

    seenValues.add(dedupeKey);
    normalizedValues.push(normalizedValue);
  }

  return normalizedValues;
}

export function parseCompanionPreferenceList(value: string): string[] {
  return normalizeCompanionPreferenceList(value.split(","));
}

export function formatCompanionPreferenceList(values: readonly string[]): string {
  return normalizeCompanionPreferenceList(values).join(", ");
}

export function buildCompanionPreferences(
  input: Partial<CompanionPreferences> | null | undefined,
): CompanionPreferences {
  const candidate = isPlainObject(input) ? input : {};

  return {
    companion_tone: isAllowedOption(
      candidate.companion_tone,
      COMPANION_TONE_OPTIONS,
    )
      ? candidate.companion_tone
      : DEFAULT_COMPANION_PREFERENCES.companion_tone,
    suggestion_style: isAllowedOption(
      candidate.suggestion_style,
      SUGGESTION_STYLE_OPTIONS,
    )
      ? candidate.suggestion_style
      : DEFAULT_COMPANION_PREFERENCES.suggestion_style,
    activity_intensity: isAllowedOption(
      candidate.activity_intensity,
      ACTIVITY_INTENSITY_OPTIONS,
    )
      ? candidate.activity_intensity
      : DEFAULT_COMPANION_PREFERENCES.activity_intensity,
    preferred_time_of_day: isAllowedOption(
      candidate.preferred_time_of_day,
      PREFERRED_TIME_OF_DAY_OPTIONS,
    )
      ? candidate.preferred_time_of_day
      : DEFAULT_COMPANION_PREFERENCES.preferred_time_of_day,
    location_preference: isAllowedOption(
      candidate.location_preference,
      LOCATION_PREFERENCE_OPTIONS,
    )
      ? candidate.location_preference
      : DEFAULT_COMPANION_PREFERENCES.location_preference,
    interests: isStringArray(candidate.interests)
      ? normalizeCompanionPreferenceList(candidate.interests)
      : [],
    avoidances: isStringArray(candidate.avoidances)
      ? normalizeCompanionPreferenceList(candidate.avoidances)
      : [],
    ai_context: isPlainObject(candidate.ai_context)
      ? (candidate.ai_context as Record<string, IdentityProfileJson>)
      : {},
  };
}

export function validateCompanionPreferencesInput(
  input: CompanionPreferencesUpdateInput,
): CompanionPreferencesValidationErrors {
  const errors: CompanionPreferencesValidationErrors = {};

  if (
    input.companion_tone !== undefined &&
    !isAllowedOption(input.companion_tone, COMPANION_TONE_OPTIONS)
  ) {
    errors.companion_tone = `Companion tone must be one of: ${COMPANION_TONE_OPTIONS.join(", ")}.`;
  }

  if (
    input.suggestion_style !== undefined &&
    !isAllowedOption(input.suggestion_style, SUGGESTION_STYLE_OPTIONS)
  ) {
    errors.suggestion_style = `Suggestion style must be one of: ${SUGGESTION_STYLE_OPTIONS.join(", ")}.`;
  }

  if (
    input.activity_intensity !== undefined &&
    !isAllowedOption(input.activity_intensity, ACTIVITY_INTENSITY_OPTIONS)
  ) {
    errors.activity_intensity = `Activity intensity must be one of: ${ACTIVITY_INTENSITY_OPTIONS.join(", ")}.`;
  }

  if (
    input.preferred_time_of_day !== undefined &&
    !isAllowedOption(input.preferred_time_of_day, PREFERRED_TIME_OF_DAY_OPTIONS)
  ) {
    errors.preferred_time_of_day = `Preferred time of day must be one of: ${PREFERRED_TIME_OF_DAY_OPTIONS.join(", ")}.`;
  }

  if (
    input.location_preference !== undefined &&
    !isAllowedOption(input.location_preference, LOCATION_PREFERENCE_OPTIONS)
  ) {
    errors.location_preference = `Location preference must be one of: ${LOCATION_PREFERENCE_OPTIONS.join(", ")}.`;
  }

  if (input.interests !== undefined && !isStringArray(input.interests)) {
    errors.interests = "Interests must be an array of text values.";
  }

  if (input.avoidances !== undefined && !isStringArray(input.avoidances)) {
    errors.avoidances = "Avoidances must be an array of text values.";
  }

  if (input.ai_context !== undefined && !isPlainObject(input.ai_context)) {
    errors.ai_context = "AI context must be a JSON object.";
  }

  return errors;
}

export function normalizeCompanionPreferencesInput(
  input: CompanionPreferencesUpdateInput,
  basePreferences: CompanionPreferences = createDefaultCompanionPreferences(),
): {
  data?: CompanionPreferences;
  fieldErrors: CompanionPreferencesValidationErrors;
} {
  const fieldErrors = validateCompanionPreferencesInput(input);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const base = buildCompanionPreferences(basePreferences);

  return {
    data: {
      companion_tone: input.companion_tone ?? base.companion_tone,
      suggestion_style: input.suggestion_style ?? base.suggestion_style,
      activity_intensity: input.activity_intensity ?? base.activity_intensity,
      preferred_time_of_day:
        input.preferred_time_of_day ?? base.preferred_time_of_day,
      location_preference:
        input.location_preference ?? base.location_preference,
      interests:
        input.interests !== undefined
          ? normalizeCompanionPreferenceList(input.interests)
          : [...base.interests],
      avoidances:
        input.avoidances !== undefined
          ? normalizeCompanionPreferenceList(input.avoidances)
          : [...base.avoidances],
      ai_context:
        input.ai_context !== undefined
          ? { ...input.ai_context }
          : { ...base.ai_context },
    },
    fieldErrors: {},
  };
}

export function getCompanionPreferencesFromProfilePreferences(
  profilePreferences: Record<string, IdentityProfileJson> | null | undefined,
): CompanionPreferences {
  if (!isPlainObject(profilePreferences)) {
    return createDefaultCompanionPreferences();
  }

  const candidate = profilePreferences[COMPANION_PREFERENCES_KEY];

  if (!isPlainObject(candidate)) {
    return createDefaultCompanionPreferences();
  }

  return buildCompanionPreferences(candidate as Partial<CompanionPreferences>);
}

export function setCompanionPreferencesOnProfilePreferences(
  profilePreferences: Record<string, IdentityProfileJson> | null | undefined,
  companionPreferences: CompanionPreferences,
): Record<string, IdentityProfileJson> {
  const nextPreferences = isPlainObject(profilePreferences)
    ? { ...profilePreferences }
    : {};

  nextPreferences[COMPANION_PREFERENCES_KEY] = {
    ...cloneCompanionPreferences(buildCompanionPreferences(companionPreferences)),
  };

  return nextPreferences as Record<string, IdentityProfileJson>;
}

export function buildCompanionPreferenceContext(
  preferences: CompanionPreferences,
): CompanionPreferenceContext {
  const normalizedPreferences = buildCompanionPreferences(preferences);

  return {
    tone: normalizedPreferences.companion_tone,
    suggestionStyle: normalizedPreferences.suggestion_style,
    activityIntensity: normalizedPreferences.activity_intensity,
    preferredTimeOfDay: normalizedPreferences.preferred_time_of_day,
    locationPreference: normalizedPreferences.location_preference,
    interests: [...normalizedPreferences.interests],
    avoidances: [...normalizedPreferences.avoidances],
  };
}
