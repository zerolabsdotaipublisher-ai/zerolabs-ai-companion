import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import type { Session, User } from "@supabase/supabase-js";

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
          personalization: "{}",
          preferences: "{}",
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
  let fromCalls = 0;
  const user = createAuthenticatedUser("user-123");

  originModule.isStateChangingAuthRequestAllowed = () => true;
  serverSessionModule.getServerAuthState = async () =>
    ({
      supabase: {
        from() {
          fromCalls += 1;
          return {};
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
          personalization: "{}",
          preferences: "{}",
        }),
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Please correct the highlighted profile fields.",
      fieldErrors: {
        timezone: "Timezone must be a valid IANA timezone.",
      },
    });
    assert.equal(fromCalls, 0);
  } finally {
    originModule.isStateChangingAuthRequestAllowed =
      originalIsStateChangingAuthRequestAllowed;
    serverSessionModule.getServerAuthState = originalGetServerAuthState;
    delete require.cache[routeModulePath];
  }
});
