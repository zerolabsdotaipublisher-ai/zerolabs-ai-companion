import type {
  IdentityProfileEditableValues,
  IdentityProfileJson,
  IdentityProfileRecord,
} from "@/lib/identity/types";

export type IdentityProfileFormValues = {
  display_name: string;
  preferred_name: string;
  timezone: string;
  locale: string;
  personalization: string;
  preferences: string;
};

export type IdentityProfileFormErrors = Partial<Record<keyof IdentityProfileFormValues, string>>;

const MAX_NAME_LENGTH = 80;
const MAX_TIMEZONE_LENGTH = 100;
const MAX_LOCALE_LENGTH = 35;
const MAX_JSON_FIELD_LENGTH = 5_000;

function isJsonObject(value: unknown): value is Record<string, IdentityProfileJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function parseJsonField(
  value: string,
  label: string,
): {
  data?: Record<string, IdentityProfileJson>;
  error?: string;
} {
  const trimmedValue = value.trim();

  if (trimmedValue.length > MAX_JSON_FIELD_LENGTH) {
    return {
      error: `${label} must be ${MAX_JSON_FIELD_LENGTH.toLocaleString()} characters or less.`,
    };
  }

  if (trimmedValue.length === 0) {
    return {
      data: {},
    };
  }

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown;

    if (!isJsonObject(parsedValue)) {
      return {
        error: `${label} must be a JSON object.`,
      };
    }

    return {
      data: parsedValue,
    };
  } catch {
    return {
      error: `${label} must be valid JSON.`,
    };
  }
}

function formatJsonObject(value: Record<string, IdentityProfileJson>): string {
  return Object.keys(value).length === 0 ? "" : JSON.stringify(value, null, 2);
}

export function normalizeIdentityProfileFormValues(
  values: IdentityProfileFormValues,
): IdentityProfileFormValues {
  return {
    display_name: values.display_name.trim(),
    preferred_name: values.preferred_name.trim(),
    timezone: values.timezone.trim(),
    locale: values.locale.trim(),
    personalization: values.personalization.trim(),
    preferences: values.preferences.trim(),
  };
}

export function toIdentityProfileFormValues(
  profile: Pick<
    IdentityProfileRecord,
    "display_name" | "preferred_name" | "timezone" | "locale" | "personalization" | "preferences"
  >,
): IdentityProfileFormValues {
  return {
    display_name: profile.display_name ?? "",
    preferred_name: profile.preferred_name ?? "",
    timezone: profile.timezone ?? "",
    locale: profile.locale ?? "",
    personalization: formatJsonObject(profile.personalization),
    preferences: formatJsonObject(profile.preferences),
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

  const personalization = parseJsonField(normalizedValues.personalization, "Personalization");
  if (personalization.error) {
    errors.personalization = personalization.error;
  }

  const preferences = parseJsonField(normalizedValues.preferences, "Preferences");
  if (preferences.error) {
    errors.preferences = preferences.error;
  }

  return errors;
}

export function buildIdentityProfileUpdateValues(
  values: IdentityProfileFormValues,
): {
  data?: IdentityProfileEditableValues;
  fieldErrors: IdentityProfileFormErrors;
} {
  const normalizedValues = normalizeIdentityProfileFormValues(values);
  const fieldErrors = validateIdentityProfileFormValues(normalizedValues);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const personalization = parseJsonField(normalizedValues.personalization, "Personalization");
  const preferences = parseJsonField(normalizedValues.preferences, "Preferences");

  if (!personalization.data || !preferences.data) {
    return {
      fieldErrors: {
        ...fieldErrors,
        ...(personalization.error ? { personalization: personalization.error } : {}),
        ...(preferences.error ? { preferences: preferences.error } : {}),
      },
    };
  }

  return {
    data: {
      display_name: normalizeOptionalText(normalizedValues.display_name),
      preferred_name: normalizeOptionalText(normalizedValues.preferred_name),
      timezone: normalizeOptionalText(normalizedValues.timezone),
      locale: normalizeOptionalText(normalizedValues.locale),
      personalization: personalization.data,
      preferences: preferences.data,
    },
    fieldErrors: {},
  };
}
