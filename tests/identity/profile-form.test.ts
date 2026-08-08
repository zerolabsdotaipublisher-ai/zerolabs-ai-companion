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
      companion_preferences: {
        companion_tone: "friendly",
        suggestion_style: "novel",
        activity_intensity: "moderate",
        preferred_time_of_day: "evening",
        location_preference: "local_area",
        interests: ["coffee walks", "bookstores"],
        avoidances: ["crowds"],
        ai_context: {
          favorite_weather: "foggy",
        },
      },
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
    companion_tone: "friendly",
    suggestion_style: "novel",
    activity_intensity: "moderate",
    preferred_time_of_day: "evening",
    location_preference: "local_area",
    interests: "coffee walks, bookstores",
    avoidances: "crowds",
  });
});

test("rejects invalid profile form values with field errors", () => {
  assert.deepEqual(
    validateIdentityProfileFormValues({
      display_name: "x".repeat(81),
      preferred_name: "",
      timezone: "Mars/Olympus",
      locale: "bad locale",
      companion_tone: "energetic",
      suggestion_style: "surprise",
      activity_intensity: "extreme",
      preferred_time_of_day: "night",
      location_preference: "galaxy",
      interests: "tea rooms",
      avoidances: "crowds",
    }),
    {
      display_name: "Display name must be 80 characters or less.",
      timezone: "Timezone must be a valid IANA timezone.",
      locale: "Locale must be a valid locale code.",
      companion_tone: "Companion tone must be one of: calm, friendly, playful, direct.",
      suggestion_style:
        "Suggestion style must be one of: balanced, novel, familiar, outdoor, indoor.",
      activity_intensity: "Activity intensity must be one of: light, moderate, active.",
      preferred_time_of_day:
        "Preferred time of day must be one of: morning, afternoon, evening, anytime.",
      location_preference:
        "Location preference must be one of: nearby, local_area, anywhere.",
    },
  );
});

test("builds normalized update values for valid profile input", () => {
  const result = buildIdentityProfileUpdateValues({
    display_name: "  Alex Johnson  ",
    preferred_name: " Alex ",
    timezone: " America/Los_Angeles ",
    locale: " en-US ",
    companion_tone: " calm ",
    suggestion_style: " balanced ",
    activity_intensity: " light ",
    preferred_time_of_day: " anytime ",
    location_preference: " nearby ",
    interests: " coffee walks, bookstores, coffee walks ",
    avoidances: " crowds, late nights ",
  });

  assert.deepEqual(result.fieldErrors, {});
  assert.deepEqual(result.data, {
    identity: {
      display_name: "Alex Johnson",
      preferred_name: "Alex",
      timezone: "America/Los_Angeles",
      locale: "en-US",
    },
    companionPreferences: {
      companion_tone: "calm",
      suggestion_style: "balanced",
      activity_intensity: "light",
      preferred_time_of_day: "anytime",
      location_preference: "nearby",
      interests: ["coffee walks", "bookstores"],
      avoidances: ["crowds", "late nights"],
    },
  });
});
