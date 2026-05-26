import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidCompanionPreferencesError,
  getCompanionPreferencesByUserId,
  updateCompanionPreferencesByUserId,
} from "@/lib/identity/preferences-server";
import {
  DEFAULT_COMPANION_PREFERENCES,
  buildCompanionPreferenceContext,
  type CompanionPreferences,
} from "@/lib/identity/preferences";
import type { IdentityProfileRecord } from "@/lib/identity/types";
import type { IdentityProfileRepository } from "@/lib/identity/profile";

function createIdentityProfileRecord(
  userId: string,
  companionPreferences: CompanionPreferences = DEFAULT_COMPANION_PREFERENCES,
): IdentityProfileRecord {
  return {
    id: `profile-${userId}`,
    user_id: userId,
    display_name: "Alex Johnson",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    onboarding_status: "completed",
    personalization: {},
    preferences: {
      companion_preferences: companionPreferences,
    },
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };
}

test("returns default companion preferences when the profile row is missing", async () => {
  const repository: IdentityProfileRepository = {
    async getByUserId() {
      return { data: null, error: null };
    },
    async updateByUserId() {
      assert.fail("updateByUserId should not run for missing profile lookups");
    },
    async upsert() {
      assert.fail("upsert should not run for missing profile lookups");
    },
  };

  const preferences = await getCompanionPreferencesByUserId({
    authenticatedUserId: "user-123",
    requestedUserId: "user-123",
    repository,
  });

  assert.deepEqual(preferences, DEFAULT_COMPANION_PREFERENCES);
});

test("updates companion preferences with sanitized values", async () => {
  const startingProfile = createIdentityProfileRecord("user-123");
  let savedValues: IdentityProfileRecord["preferences"] | undefined;
  const repository: IdentityProfileRepository = {
    async getByUserId() {
      return { data: startingProfile, error: null };
    },
    async updateByUserId(_userId, values) {
      savedValues = values.preferences;

      return {
        data: {
          ...startingProfile,
          ...values,
        },
        error: null,
      };
    },
    async upsert() {
      assert.fail("upsert should not run when the profile already exists");
    },
  };

  const preferences = await updateCompanionPreferencesByUserId({
    authenticatedUserId: "user-123",
    requestedUserId: "user-123",
    repository,
    input: {
      companion_tone: "friendly",
      suggestion_style: "familiar",
      interests: [" bookstores ", "bookstores", "coffee walks"],
      avoidances: ["crowds", " crowds "],
    },
  });

  assert.deepEqual(preferences, {
    ...DEFAULT_COMPANION_PREFERENCES,
    companion_tone: "friendly",
    suggestion_style: "familiar",
    interests: ["bookstores", "coffee walks"],
    avoidances: ["crowds"],
  });
  assert.deepEqual(savedValues, {
    companion_preferences: {
      ...DEFAULT_COMPANION_PREFERENCES,
      companion_tone: "friendly",
      suggestion_style: "familiar",
      interests: ["bookstores", "coffee walks"],
      avoidances: ["crowds"],
    },
  });
});

test("rejects invalid companion preference enum values", async () => {
  const repository: IdentityProfileRepository = {
    async getByUserId() {
      return { data: createIdentityProfileRecord("user-123"), error: null };
    },
    async updateByUserId() {
      assert.fail("updateByUserId should not run when the input is invalid");
    },
    async upsert() {
      assert.fail("upsert should not run when the profile already exists");
    },
  };

  await assert.rejects(
    () =>
      updateCompanionPreferencesByUserId({
        authenticatedUserId: "user-123",
        requestedUserId: "user-123",
        repository,
        input: {
          companion_tone: "energetic" as CompanionPreferences["companion_tone"],
        },
      }),
    (error) => {
      assert.equal(error instanceof InvalidCompanionPreferencesError, true);

      if (!(error instanceof InvalidCompanionPreferencesError)) {
        return false;
      }

      assert.deepEqual(error.fieldErrors, {
        companion_tone:
          "Companion tone must be one of: calm, friendly, playful, direct.",
      });
      return true;
    },
  );
});

test("builds a safe companion preference context without ai_context data", () => {
  assert.deepEqual(
    buildCompanionPreferenceContext({
      ...DEFAULT_COMPANION_PREFERENCES,
      companion_tone: "playful",
      interests: ["coffee walks"],
      avoidances: ["crowds"],
      ai_context: {
        internal_only: true,
      },
    }),
    {
      tone: "playful",
      suggestionStyle: "balanced",
      activityIntensity: "light",
      preferredTimeOfDay: "anytime",
      locationPreference: "nearby",
      interests: ["coffee walks"],
      avoidances: ["crowds"],
    },
  );
});
