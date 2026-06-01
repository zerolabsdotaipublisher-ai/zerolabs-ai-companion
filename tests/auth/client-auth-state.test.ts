import assert from "node:assert/strict";
import test from "node:test";

import {
  getClientAuthStatus,
  resolveClientAuthTransition,
} from "../../src/lib/auth/client-auth-state";

test("reports authenticated and unauthenticated client auth states", () => {
  assert.equal(getClientAuthStatus(true), "authenticated");
  assert.equal(getClientAuthStatus(false), "unauthenticated");
});

test("redirects signed-out users away from protected routes", () => {
  assert.deepEqual(
    resolveClientAuthTransition({
      currentPathname: "/dashboard",
      currentSearch: "?tab=account",
      event: "SIGNED_OUT",
      hasSession: false,
      previousStatus: "authenticated",
    }),
    {
      nextStatus: "unauthenticated",
      redirectTo: "/login?next=%2Fdashboard%3Ftab%3Daccount",
      shouldRefresh: true,
    },
  );
});

test("redirects signed-in users away from auth entry routes", () => {
  assert.deepEqual(
    resolveClientAuthTransition({
      currentPathname: "/login",
      event: "SIGNED_IN",
      hasSession: true,
      previousStatus: "unauthenticated",
    }),
    {
      nextStatus: "authenticated",
      redirectTo: "/dashboard",
      shouldRefresh: true,
    },
  );
});

test("avoids unnecessary refresh work when the initial session matches the current public UI", () => {
  assert.deepEqual(
    resolveClientAuthTransition({
      currentPathname: "/",
      event: "INITIAL_SESSION",
      hasSession: false,
      previousStatus: "unauthenticated",
    }),
    {
      nextStatus: "unauthenticated",
      redirectTo: null,
      shouldRefresh: false,
    },
  );
});

test("refreshes authenticated UI on non-initial auth updates without redirecting public routes", () => {
  assert.deepEqual(
    resolveClientAuthTransition({
      currentPathname: "/",
      event: "TOKEN_REFRESHED",
      hasSession: true,
      previousStatus: "authenticated",
    }),
    {
      nextStatus: "authenticated",
      redirectTo: null,
      shouldRefresh: true,
    },
  );
});
