import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import type { Session, User } from "@supabase/supabase-js";
import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/identity/preferences";

const requireFromTest = createRequire(__filename);

function createAuthenticatedUser(userId: string): User {
  return {
    id: userId,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function createAuthenticatedSession(user: User): Session {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: "bearer",
    user,
  };
}

test("blocks unauthenticated profile update requests", async () => {
  const originModule = requireFromTest("../../src/lib/auth/origin") as typeof import("../../src/lib/auth/origin");
  const serverSessionModule = requireFromTest(
    "../../src/lib/auth/server-session",
  ) as typeof import("../../src/lib/auth/server-session");
  const routeModulePath = requireFromTest.resolve("../../src/app/api/profile/route");
  const originalIsStateChangingAuthRequestAllowed =
    originModule.isStateChangingAuthRequestAllowed;
  const originalGetServerAuthState = serverSessionModule.getServerAuthState;

  originModule.isStateChangingAuthRequestAllowed = () => true;
  serverSessionModule.getServerAuthState = async () =>
    ({
      supabase: {},
      session: null,
      user: null,
    }) as unknown as Awaited<ReturnType<typeof serverSessionModule.getServerAuthState>>;

  delete require.cache[routeModulePath];

  try {
    const { PATCH } = requireFromTest(
      "../../src/app/api/profile/route",
    ) as typeof import("../../src/app/api/profile/route");
    const response = await PATCH(
      new Request("https://example.com/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          display_name: "Alex",
          preferred_name: "Alex",
          timezone: "America/Los_Angeles",
          locale: "en-US",
          companion_tone: "calm",
          suggestion_style: "balanced",
          activity_intensity: "light",
          preferred_time_of_day: "anytime",
          location_preference: "nearby",
          interests: "coffee walks",
          avoidances: "crowds",
        }),
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "You must be signed in to update your profile.",
    });
  } finally {
    originModule.isStateChangingAuthRequestAllowed =
      originalIsStateChangingAuthRequestAllowed;
    serverSessionModule.getServerAuthState = originalGetServerAuthState;
    delete require.cache[routeModulePath];
  }
});

test("rejects invalid profile update input before writing to Supabase", async () => {
  const originModule = requireFromTest("../../src/lib/auth/origin") as typeof import("../../src/lib/auth/origin");
  const serverSessionModule = requireFromTest(
    "../../src/lib/auth/server-session",
  ) as typeof import("../../src/lib/auth/server-session");
  const routeModulePath = requireFromTest.resolve("../../src/app/api/profile/route");
  const originalIsStateChangingAuthRequestAllowed =
    originModule.isStateChangingAuthRequestAllowed;
  const originalGetServerAuthState = serverSessionModule.getServerAuthState;
  let updateCalls = 0;
  const user = createAuthenticatedUser("user-123");
  const storedProfile = {
    id: "profile-123",
    user_id: "user-123",
    display_name: "Alex",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    onboarding_status: "completed",
    personalization: {},
    preferences: {
      companion_preferences: DEFAULT_COMPANION_PREFERENCES,
    },
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };

  originModule.isStateChangingAuthRequestAllowed = () => true;
  serverSessionModule.getServerAuthState = async () =>
    ({
      supabase: {
        from() {
          return {
            select() {
              return this;
            },
            eq() {
              return {
                maybeSingle: async () => ({
                  data: storedProfile,
                  error: null,
                }),
              };
            },
            update() {
              updateCalls += 1;
              return {
                eq() {
                  throw new Error("update should not be called for invalid input");
                },
              };
            },
          };
        },
      },
      session: createAuthenticatedSession(user),
      user,
    }) as unknown as Awaited<ReturnType<typeof serverSessionModule.getServerAuthState>>;

  delete require.cache[routeModulePath];

  try {
    const { PATCH } = requireFromTest(
      "../../src/app/api/profile/route",
    ) as typeof import("../../src/app/api/profile/route");
    const response = await PATCH(
      new Request("https://example.com/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          display_name: "Alex",
          preferred_name: "Alex",
          timezone: "Mars/Olympus",
          locale: "en-US",
          companion_tone: "energetic",
          suggestion_style: "balanced",
          activity_intensity: "light",
          preferred_time_of_day: "anytime",
          location_preference: "nearby",
          interests: "coffee walks",
          avoidances: "crowds",
        }),
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Please correct the highlighted profile fields.",
      fieldErrors: {
        companion_tone:
          "Companion tone must be one of: calm, friendly, playful, direct.",
        timezone: "Timezone must be a valid IANA timezone.",
      },
    });
    assert.equal(updateCalls, 0);
  } finally {
    originModule.isStateChangingAuthRequestAllowed =
      originalIsStateChangingAuthRequestAllowed;
    serverSessionModule.getServerAuthState = originalGetServerAuthState;
    delete require.cache[routeModulePath];
  }
});

test("ignores client user_id overrides when updating profile preferences", async () => {
  const originModule = requireFromTest("../../src/lib/auth/origin") as typeof import("../../src/lib/auth/origin");
  const serverSessionModule = requireFromTest(
    "../../src/lib/auth/server-session",
  ) as typeof import("../../src/lib/auth/server-session");
  const routeModulePath = requireFromTest.resolve("../../src/app/api/profile/route");
  const originalIsStateChangingAuthRequestAllowed =
    originModule.isStateChangingAuthRequestAllowed;
  const originalGetServerAuthState = serverSessionModule.getServerAuthState;
  const user = createAuthenticatedUser("user-123");
  const storedProfile = {
    id: "profile-123",
    user_id: "user-123",
    display_name: "Alex",
    preferred_name: "Alex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    onboarding_status: "completed",
    personalization: {},
    preferences: {
      companion_preferences: DEFAULT_COMPANION_PREFERENCES,
    },
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };
  let updatedUserId: string | undefined;
  let savedValues: Record<string, unknown> | undefined;

  originModule.isStateChangingAuthRequestAllowed = () => true;
  serverSessionModule.getServerAuthState = async () =>
    ({
      supabase: {
        from() {
          return {
            select() {
              return this;
            },
            eq() {
              return {
                maybeSingle: async () => ({
                  data: storedProfile,
                  error: null,
                }),
              };
            },
            update(values: Record<string, unknown>) {
              savedValues = values;

              return {
                eq(_column: string, userId: string) {
                  updatedUserId = userId;

                  return {
                    select() {
                      return {
                        maybeSingle: async () => ({
                          data: {
                            ...storedProfile,
                            ...values,
                          },
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      },
      session: createAuthenticatedSession(user),
      user,
    }) as unknown as Awaited<ReturnType<typeof serverSessionModule.getServerAuthState>>;

  delete require.cache[routeModulePath];

  try {
    const { PATCH } = requireFromTest(
      "../../src/app/api/profile/route",
    ) as typeof import("../../src/app/api/profile/route");
    const response = await PATCH(
      new Request("https://example.com/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user_id: "user-456",
          display_name: "Alex",
          preferred_name: "Alex",
          timezone: "America/Los_Angeles",
          locale: "en-US",
          companion_tone: "playful",
          suggestion_style: "novel",
          activity_intensity: "moderate",
          preferred_time_of_day: "evening",
          location_preference: "local_area",
          interests: "coffee walks, bookstores",
          avoidances: "crowds",
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(updatedUserId, "user-123");
    assert.equal("user_id" in (savedValues ?? {}), false);
    assert.deepEqual(savedValues?.preferences, {
      companion_preferences: {
        ...DEFAULT_COMPANION_PREFERENCES,
        companion_tone: "playful",
        suggestion_style: "novel",
        activity_intensity: "moderate",
        preferred_time_of_day: "evening",
        location_preference: "local_area",
        interests: ["coffee walks", "bookstores"],
        avoidances: ["crowds"],
      },
    });
  } finally {
    originModule.isStateChangingAuthRequestAllowed =
      originalIsStateChangingAuthRequestAllowed;
    serverSessionModule.getServerAuthState = originalGetServerAuthState;
    delete require.cache[routeModulePath];
  }
});

test("preserves omitted companion preference fields during partial profile updates", async () => {
  const originModule = requireFromTest("../../src/lib/auth/origin") as typeof import("../../src/lib/auth/origin");
  const serverSessionModule = requireFromTest(
    "../../src/lib/auth/server-session",
  ) as typeof import("../../src/lib/auth/server-session");
  const routeModulePath = requireFromTest.resolve("../../src/app/api/profile/route");
  const originalIsStateChangingAuthRequestAllowed =
    originModule.isStateChangingAuthRequestAllowed;
  const originalGetServerAuthState = serverSessionModule.getServerAuthState;
  const user = createAuthenticatedUser("user-123");
  const storedProfile = {
    id: "profile-123",
    user_id: "user-123",
    display_name: "Alex",
    preferred_name: "Lex",
    timezone: "America/Los_Angeles",
    locale: "en-US",
    onboarding_status: "completed",
    personalization: {},
    preferences: {
      companion_preferences: {
        ...DEFAULT_COMPANION_PREFERENCES,
        companion_tone: "friendly",
        suggestion_style: "familiar",
        activity_intensity: "moderate",
        preferred_time_of_day: "evening",
        location_preference: "local_area",
        interests: ["coffee walks"],
        avoidances: ["crowds"],
      },
    },
    memory_settings: {},
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
  };
  let savedValues: Record<string, unknown> | undefined;

  originModule.isStateChangingAuthRequestAllowed = () => true;
  serverSessionModule.getServerAuthState = async () =>
    ({
      supabase: {
        from() {
          return {
            select() {
              return this;
            },
            eq() {
              return {
                maybeSingle: async () => ({
                  data: storedProfile,
                  error: null,
                }),
              };
            },
            update(values: Record<string, unknown>) {
              savedValues = values;

              return {
                eq() {
                  return {
                    select() {
                      return {
                        maybeSingle: async () => ({
                          data: {
                            ...storedProfile,
                            ...values,
                          },
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      },
      session: createAuthenticatedSession(user),
      user,
    }) as unknown as Awaited<ReturnType<typeof serverSessionModule.getServerAuthState>>;

  delete require.cache[routeModulePath];

  try {
    const { PATCH } = requireFromTest(
      "../../src/app/api/profile/route",
    ) as typeof import("../../src/app/api/profile/route");
    const response = await PATCH(
      new Request("https://example.com/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companion_tone: "playful",
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(savedValues?.display_name, "Alex");
    assert.equal(savedValues?.preferred_name, "Lex");
    assert.deepEqual(savedValues?.preferences, {
      companion_preferences: {
        ...DEFAULT_COMPANION_PREFERENCES,
        companion_tone: "playful",
        suggestion_style: "familiar",
        activity_intensity: "moderate",
        preferred_time_of_day: "evening",
        location_preference: "local_area",
        interests: ["coffee walks"],
        avoidances: ["crowds"],
      },
    });
  } finally {
    originModule.isStateChangingAuthRequestAllowed =
      originalIsStateChangingAuthRequestAllowed;
    serverSessionModule.getServerAuthState = originalGetServerAuthState;
    delete require.cache[routeModulePath];
  }
});
