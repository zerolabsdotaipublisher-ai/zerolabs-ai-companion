import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIdentityProfileUpsertValues,
  isIdentityProfileAccessAllowed,
} from "@/lib/identity/profile";

test("builds identity profile upsert values with MVP defaults", () => {
  assert.deepEqual(buildIdentityProfileUpsertValues("user-123"), {
    user_id: "user-123",
    display_name: null,
    preferred_name: null,
    timezone: null,
    locale: null,
    onboarding_status: "not_started",
    personalization: {},
    preferences: {},
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
        daily_summary: true,
      },
      memory_settings: {
        capture_enabled: true,
      },
    },
  );
});

test("allows identity profile access only for the authenticated user", () => {
  assert.equal(isIdentityProfileAccessAllowed("user-123", "user-123"), true);
  assert.equal(isIdentityProfileAccessAllowed("user-123", "user-456"), false);
  assert.equal(isIdentityProfileAccessAllowed(null, "user-123"), false);
});
