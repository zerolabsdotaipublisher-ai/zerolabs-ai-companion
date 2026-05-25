import assert from "node:assert/strict";
import test from "node:test";

import type {
  IdentityProfileRecord,
  IdentityProfileUpsertValues,
} from "@/lib/identity/profile";
import {
  provisionSignupIdentityProfile,
  SignupProfileProvisionError,
  type SignupProfileRepository,
} from "@/lib/auth/signup-profile";

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
    preferences: {},
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };
}

function createLoggerSpy() {
  const entries = {
    error: [] as Array<{ message: string; options?: unknown }>,
    info: [] as Array<{ message: string; options?: unknown }>,
    warn: [] as Array<{ message: string; options?: unknown }>,
  };

  return {
    entries,
    logger: {
      error(message: string, options?: unknown) {
        entries.error.push({ message, options });
      },
      info(message: string, options?: unknown) {
        entries.info.push({ message, options });
      },
      warn(message: string, options?: unknown) {
        entries.warn.push({ message, options });
      },
    },
  };
}

test("creates an identity profile after auth signup", async () => {
  let insertedValues: IdentityProfileUpsertValues | undefined;
  const repository: SignupProfileRepository = {
    async getByUserId() {
      return { data: null, error: null };
    },
    async insert(values) {
      insertedValues = values;
      return { data: createIdentityProfileRecord(values.user_id), error: null };
    },
  };

  const { logger, entries } = createLoggerSpy();
  const rollbackCalls: string[] = [];
  const result = await provisionSignupIdentityProfile({
    profileRepository: repository,
    rollbackAuthUser: async (userId) => {
      rollbackCalls.push(userId);
      return { error: null };
    },
    userId: "user-123",
    workflowLogger: logger,
  });

  assert.equal(result.status, "created");
  assert.equal(result.profile.user_id, "user-123");
  assert.deepEqual(insertedValues, {
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
  assert.deepEqual(rollbackCalls, []);
  assert.deepEqual(entries.error, []);
  assert.deepEqual(entries.warn, []);
});

test("rolls back the auth user when identity profile creation fails", async () => {
  const repository: SignupProfileRepository = {
    async getByUserId() {
      return { data: null, error: null };
    },
    async insert() {
      return { data: null, error: new Error("insert failed") };
    },
  };

  const { logger, entries } = createLoggerSpy();
  const rollbackCalls: string[] = [];

  await assert.rejects(
    () =>
      provisionSignupIdentityProfile({
        profileRepository: repository,
        requestPath: "/auth/signup",
        rollbackAuthUser: async (userId) => {
          rollbackCalls.push(userId);
          return { error: null };
        },
        userId: "user-rollback",
        workflowLogger: logger,
      }),
    (error) => {
      assert.equal(error instanceof SignupProfileProvisionError, true);

      if (!(error instanceof SignupProfileProvisionError)) {
        return false;
      }

      assert.equal(error.rollbackAttempted, true);
      assert.equal(error.rollbackSucceeded, true);
      assert.equal(
        error.userMessage,
        "Unable to create account right now. Please try again.",
      );
      return true;
    },
  );

  assert.deepEqual(rollbackCalls, ["user-rollback"]);
  assert.deepEqual(
    entries.error.map((entry) => entry.message),
    ["Identity profile creation failed after auth signup."],
  );
  assert.deepEqual(
    entries.warn.map((entry) => entry.message),
    ["Attempting auth user rollback after identity profile creation failed."],
  );
  assert.deepEqual(
    entries.info.map((entry) => entry.message),
    ["Rolled back auth user after identity profile creation failed."],
  );
});

test("avoids creating duplicate identity profiles when one already exists", async () => {
  let insertCalls = 0;
  const existingProfile = createIdentityProfileRecord("user-existing");
  const repository: SignupProfileRepository = {
    async getByUserId() {
      return { data: existingProfile, error: null };
    },
    async insert() {
      insertCalls += 1;
      return { data: null, error: null };
    },
  };

  const { logger, entries } = createLoggerSpy();
  const result = await provisionSignupIdentityProfile({
    profileRepository: repository,
    rollbackAuthUser: async () => ({ error: null }),
    userId: "user-existing",
    workflowLogger: logger,
  });

  assert.equal(result.status, "existing");
  assert.equal(result.profile.id, existingProfile.id);
  assert.equal(insertCalls, 0);
  assert.deepEqual(
    entries.info.map((entry) => entry.message),
    ["Identity profile already existed after auth signup."],
  );
});

test("logs a clear migration diagnostic when identity_profiles is missing", async () => {
  const repository: SignupProfileRepository = {
    async getByUserId() {
      return {
        data: null,
        error: {
          code: "PGRST205",
          message:
            "Could not find the table 'public.identity_profiles' in the schema cache",
        },
      };
    },
    async insert() {
      assert.fail("insert should not be attempted when profile lookup fails");
    },
  };

  const { logger, entries } = createLoggerSpy();
  const rollbackCalls: string[] = [];

  await assert.rejects(
    () =>
      provisionSignupIdentityProfile({
        profileRepository: repository,
        requestPath: "/auth/signup",
        rollbackAuthUser: async (userId) => {
          rollbackCalls.push(userId);
          return { error: null };
        },
        userId: "user-missing-table",
        workflowLogger: logger,
      }),
    SignupProfileProvisionError,
  );

  assert.deepEqual(rollbackCalls, ["user-missing-table"]);
  assert.deepEqual(
    entries.error.map((entry) => entry.message),
    [
      "Identity profile provisioning depends on the Task 5.1 migration. Apply the identity_profiles migration to the target Supabase database before validating signup.",
      "Identity profile lookup failed after auth signup.",
    ],
  );

  const diagnosticEntry = entries.error[0];
  assert.deepEqual(diagnosticEntry.options, {
    context: "auth",
    source: "auth.signup",
    error: {
      code: "PGRST205",
      message:
        "Could not find the table 'public.identity_profiles' in the schema cache",
    },
    metadata: {
      migrationDependency: "AIC-205 Task 5.1",
      migrationFile:
        "supabase/migrations/20260525014500_create_identity_profiles.sql",
      requestPath: "/auth/signup",
      userId: "user-missing-table",
    },
  });
  assert.deepEqual(
    entries.warn.map((entry) => entry.message),
    ["Attempting auth user rollback after identity profile creation failed."],
  );
});
