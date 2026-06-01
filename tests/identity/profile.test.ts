import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/identity/preferences";
import {
  buildIdentityProfileUpsertValues,
  getIdentityProfileByUserId,
  isIdentityProfileAccessAllowed,
  updateIdentityProfileByUserId,
  type IdentityProfileEditableValues,
  type IdentityProfileRecord,
  type IdentityProfileRepository,
} from "@/lib/identity/profile";

function createIdentityProfileRecord(userId: string): IdentityProfileRecord {
  return {
    id: `profile-${userId}`,
    user_id: userId,
    display_name: null,
    preferred_name: null,
    timezone: null,
    locale: null,
    onboarding_status: "not_started",
    personalization: {},
    preferences: {
      companion_preferences: DEFAULT_COMPANION_PREFERENCES,
    },
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };
}

test("builds identity profile upsert values with MVP defaults", () => {
  assert.deepEqual(buildIdentityProfileUpsertValues("user-123"), {
    user_id: "user-123",
    display_name: null,
    preferred_name: null,
    timezone: null,
    locale: null,
    onboarding_status: "not_started",
    personalization: {},
    preferences: {
      companion_preferences: DEFAULT_COMPANION_PREFERENCES,
    },
    memory_settings: {},
  });
});

test("preserves provided identity profile defaults", () => {
  assert.deepEqual(
    buildIdentityProfileUpsertValues("user-123", {
      display_name: "Alex Johnson",
      preferred_name: "Alex",
      timezone: "America/Los_Angeles",
      locale: "en-US",
      onboarding_status: "in_progress",
      personalization: {
        communication_style: "concise",
      },
      preferences: {
        companion_preferences: {
          ...DEFAULT_COMPANION_PREFERENCES,
          suggestion_style: "novel",
        },
        daily_summary: true,
      },
      memory_settings: {
        capture_enabled: true,
      },
    }),
    {
      user_id: "user-123",
      display_name: "Alex Johnson",
      preferred_name: "Alex",
      timezone: "America/Los_Angeles",
      locale: "en-US",
      onboarding_status: "in_progress",
      personalization: {
        communication_style: "concise",
      },
      preferences: {
        companion_preferences: {
          ...DEFAULT_COMPANION_PREFERENCES,
          suggestion_style: "novel",
        },
        daily_summary: true,
      },
      memory_settings: {
        capture_enabled: true,
      },
    },
  );
});

test("replaces malformed companion preference defaults during upsert normalization", () => {
  assert.deepEqual(
    buildIdentityProfileUpsertValues("user-123", {
      preferences: {
        companion_preferences: "invalid",
        daily_summary: true,
      },
    }),
    {
      user_id: "user-123",
      display_name: null,
      preferred_name: null,
      timezone: null,
      locale: null,
      onboarding_status: "not_started",
      personalization: {},
      preferences: {
        companion_preferences: DEFAULT_COMPANION_PREFERENCES,
        daily_summary: true,
      },
      memory_settings: {},
    },
  );
});

test("allows identity profile access only for the authenticated user", () => {
  assert.equal(isIdentityProfileAccessAllowed("user-123", "user-123"), true);
  assert.equal(isIdentityProfileAccessAllowed("user-123", "user-456"), false);
  assert.equal(isIdentityProfileAccessAllowed(null, "user-123"), false);
});

test("loads the authenticated user's identity profile", async () => {
  let lookedUpUserId: string | undefined;
  const expectedProfile = createIdentityProfileRecord("user-123");
  const repository: IdentityProfileRepository = {
    async getByUserId(userId) {
      lookedUpUserId = userId;
      return {
        data: expectedProfile,
        error: null,
      };
    },
    async updateByUserId() {
      assert.fail("updateByUserId should not be called while loading");
    },
    async upsert() {
      assert.fail("upsert should not be called while loading");
    },
  };

  const profile = await getIdentityProfileByUserId({
    authenticatedUserId: "user-123",
    requestedUserId: "user-123",
    repository,
  });

  assert.equal(lookedUpUserId, "user-123");
  assert.equal(profile?.id, expectedProfile.id);
});

test("updates the authenticated user's profile without upserting a duplicate record", async () => {
  const updateValues: IdentityProfileEditableValues = {
    display_name: "Alex Johnson",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    personalization: {
      communication_style: "concise",
    },
    preferences: {
      daily_summary: true,
    },
  };
  const updatedProfile: IdentityProfileRecord = {
    ...createIdentityProfileRecord("user-123"),
    ...updateValues,
  };
  let updatedUserId: string | undefined;
  let savedValues: IdentityProfileEditableValues | undefined;
  let upsertCalls = 0;
  const repository: IdentityProfileRepository = {
    async getByUserId() {
      assert.fail("getByUserId should not be called while updating");
    },
    async updateByUserId(userId, values) {
      updatedUserId = userId;
      savedValues = values;
      return {
        data: updatedProfile,
        error: null,
      };
    },
    async upsert() {
      upsertCalls += 1;
      return {
        data: null,
        error: null,
      };
    },
  };

  const profile = await updateIdentityProfileByUserId({
    authenticatedUserId: "user-123",
    requestedUserId: "user-123",
    repository,
    values: updateValues,
  });

  assert.equal(updatedUserId, "user-123");
  assert.deepEqual(savedValues, updateValues);
  assert.equal(upsertCalls, 0);
  assert.equal(profile.display_name, "Alex Johnson");
});

test("rejects profile updates for a different authenticated user", async () => {
  const updateValues: IdentityProfileEditableValues = {
    display_name: "Alex Johnson",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    personalization: {},
    preferences: {
      companion_preferences: DEFAULT_COMPANION_PREFERENCES,
    },
  };
  let updateCalls = 0;
  const repository: IdentityProfileRepository = {
    async getByUserId() {
      assert.fail("getByUserId should not be called while updating");
    },
    async updateByUserId() {
      updateCalls += 1;
      return {
        data: createIdentityProfileRecord("user-123"),
        error: null,
      };
    },
    async upsert() {
      assert.fail("upsert should not be called while updating");
    },
  };

  await assert.rejects(
    () =>
      updateIdentityProfileByUserId({
        authenticatedUserId: "user-456",
        requestedUserId: "user-123",
        repository,
        values: updateValues,
      }),
    {
      message: "Identity profile access is limited to the authenticated user.",
    },
  );

  assert.equal(updateCalls, 0);
});
