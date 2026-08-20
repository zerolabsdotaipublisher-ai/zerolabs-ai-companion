import type {
  IdentityProfileEditableValues,
  IdentityProfileRecord,
} from "@/lib/identity/types";
import {
  formatCompanionPreferenceList,
  getCompanionPreferencesFromProfilePreferences,
  normalizeCompanionPreferencesInput,
  parseCompanionPreferenceList,
  type CompanionPreferencesUpdateInput,
} from "@/lib/identity/preferences";

export type IdentityProfileFormValues = {
  display_name: string;
  preferred_name: string;
  timezone: string;
  locale: string;
  companion_tone: string;
  suggestion_style: string;
  activity_intensity: string;
  preferred_time_of_day: string;
  location_preference: string;
  interests: string;
  avoidances: string;
};

export type IdentityProfileFormErrors = Partial<Record<keyof IdentityProfileFormValues, string>>;
export type IdentityProfileFormSubmission = {
  identity: Pick<
    IdentityProfileEditableValues,
    "display_name" | "preferred_name" | "timezone" | "locale"
  >;
  companionPreferences: CompanionPreferencesUpdateInput;
};

const MAX_NAME_LENGTH = 80;
const MAX_TIMEZONE_LENGTH = 100;
const MAX_LOCALE_LENGTH = 35;

function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length > 0;
  } catch {
    return false;
  }
}

export function normalizeIdentityProfileFormValues(
  values: IdentityProfileFormValues,
): IdentityProfileFormValues {
  return {
    display_name: values.display_name.trim(),
    preferred_name: values.preferred_name.trim(),
    timezone: values.timezone.trim(),
    locale: values.locale.trim(),
    companion_tone: values.companion_tone.trim(),
    suggestion_style: values.suggestion_style.trim(),
    activity_intensity: values.activity_intensity.trim(),
    preferred_time_of_day: values.preferred_time_of_day.trim(),
    location_preference: values.location_preference.trim(),
    interests: values.interests.trim(),
    avoidances: values.avoidances.trim(),
  };
}

export function toIdentityProfileFormValues(
  profile: Pick<
    IdentityProfileRecord,
    "display_name" | "preferred_name" | "timezone" | "locale" | "preferences"
  >,
): IdentityProfileFormValues {
  const companionPreferences = getCompanionPreferencesFromProfilePreferences(profile.preferences);

  return {
    display_name: profile.display_name ?? "",
    preferred_name: profile.preferred_name ?? "",
    timezone: profile.timezone ?? "",
    locale: profile.locale ?? "",
    companion_tone: companionPreferences.companion_tone,
    suggestion_style: companionPreferences.suggestion_style,
    activity_intensity: companionPreferences.activity_intensity,
    preferred_time_of_day: companionPreferences.preferred_time_of_day,
    location_preference: companionPreferences.location_preference,
    interests: formatCompanionPreferenceList(companionPreferences.interests),
    avoidances: formatCompanionPreferenceList(companionPreferences.avoidances),
  };
}

function buildCompanionPreferencesUpdateInput(
  values: IdentityProfileFormValues,
): CompanionPreferencesUpdateInput {
  return {
    companion_tone:
      values.companion_tone as CompanionPreferencesUpdateInput["companion_tone"],
    suggestion_style:
      values.suggestion_style as CompanionPreferencesUpdateInput["suggestion_style"],
    activity_intensity:
      values.activity_intensity as CompanionPreferencesUpdateInput["activity_intensity"],
    preferred_time_of_day:
      values.preferred_time_of_day as CompanionPreferencesUpdateInput["preferred_time_of_day"],
    location_preference:
      values.location_preference as CompanionPreferencesUpdateInput["location_preference"],
    interests: parseCompanionPreferenceList(values.interests),
    avoidances: parseCompanionPreferenceList(values.avoidances),
  };
}

export function validateIdentityProfileFormValues(
  values: IdentityProfileFormValues,
): IdentityProfileFormErrors {
  const normalizedValues = normalizeIdentityProfileFormValues(values);
  const errors: IdentityProfileFormErrors = {};

  if (normalizedValues.display_name.length > MAX_NAME_LENGTH) {
    errors.display_name = `Display name must be ${MAX_NAME_LENGTH} characters or less.`;
  }

  if (normalizedValues.preferred_name.length > MAX_NAME_LENGTH) {
    errors.preferred_name = `Preferred name must be ${MAX_NAME_LENGTH} characters or less.`;
  }

  if (normalizedValues.timezone.length > MAX_TIMEZONE_LENGTH) {
    errors.timezone = `Timezone must be ${MAX_TIMEZONE_LENGTH} characters or less.`;
  } else if (
    normalizedValues.timezone.length > 0 &&
    !isValidTimezone(normalizedValues.timezone)
  ) {
    errors.timezone = "Timezone must be a valid IANA timezone.";
  }

  if (normalizedValues.locale.length > MAX_LOCALE_LENGTH) {
    errors.locale = `Locale must be ${MAX_LOCALE_LENGTH} characters or less.`;
  } else if (normalizedValues.locale.length > 0 && !isValidLocale(normalizedValues.locale)) {
    errors.locale = "Locale must be a valid locale code.";
  }

  const preferenceValidation = normalizeCompanionPreferencesInput(
    buildCompanionPreferencesUpdateInput(normalizedValues),
  );

  if (!preferenceValidation.data) {
    Object.assign(errors, preferenceValidation.fieldErrors);
  }

  return errors;
}

export function buildIdentityProfileUpdateValues(
  values: IdentityProfileFormValues,
): {
  data?: IdentityProfileFormSubmission;
  fieldErrors: IdentityProfileFormErrors;
} {
  const normalizedValues = normalizeIdentityProfileFormValues(values);
  const fieldErrors = validateIdentityProfileFormValues(normalizedValues);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    data: {
      identity: {
        display_name: normalizeOptionalText(normalizedValues.display_name),
        preferred_name: normalizeOptionalText(normalizedValues.preferred_name),
        timezone: normalizeOptionalText(normalizedValues.timezone),
        locale: normalizeOptionalText(normalizedValues.locale),
      },
      companionPreferences: buildCompanionPreferencesUpdateInput(normalizedValues),
    },
    fieldErrors: {},
  };
}
