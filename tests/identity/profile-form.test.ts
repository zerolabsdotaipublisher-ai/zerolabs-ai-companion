import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIdentityProfileUpdateValues,
  toIdentityProfileFormValues,
  validateIdentityProfileFormValues,
} from "@/lib/identity/profile-form";
import type { IdentityProfileRecord } from "@/lib/identity/types";

function createIdentityProfileRecord(): IdentityProfileRecord {
  return {
    id: "profile-123",
    user_id: "user-123",
    display_name: "Alex Johnson",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    onboarding_status: "completed",
    personalization: {
      communication_style: "concise",
    },
    preferences: {
      daily_summary: true,
    },
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };
}

test("maps identity profile records into editable form values", () => {
  assert.deepEqual(toIdentityProfileFormValues(createIdentityProfileRecord()), {
    display_name: "Alex Johnson",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    personalization: '{\n  "communication_style": "concise"\n}',
    preferences: '{\n  "daily_summary": true\n}',
  });
});

test("rejects invalid profile form values with field errors", () => {
  assert.deepEqual(
    validateIdentityProfileFormValues({
      display_name: "x".repeat(81),
      preferred_name: "",
      timezone: "Mars/Olympus",
      locale: "bad locale",
      personalization: "[]",
      preferences: "{invalid}",
    }),
    {
      display_name: "Display name must be 80 characters or less.",
      timezone: "Timezone must be a valid IANA timezone.",
      locale: "Locale must be a valid locale code.",
      personalization: "Personalization must be a JSON object.",
      preferences: "Preferences must be valid JSON.",
    },
  );
});

test("builds normalized update values for valid profile input", () => {
  const result = buildIdentityProfileUpdateValues({
    display_name: "  Alex Johnson  ",
    preferred_name: " Alex ",
    timezone: " America/Los_Angeles ",
    locale: " en-US ",
    personalization: ' { "communication_style": "concise" } ',
    preferences: "",
  });

  assert.deepEqual(result.fieldErrors, {});
  assert.deepEqual(result.data, {
    display_name: "Alex Johnson",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    personalization: {
      communication_style: "concise",
    },
    preferences: {},
  });
});
