import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveLogoutRedirectPath,
  resolveLogoutRedirectPathFromResponseBody,
} from "../../src/lib/auth/logout";

test("uses redirectTo from the logout JSON response when it is a safe internal path", () => {
  assert.equal(
    resolveLogoutRedirectPathFromResponseBody({
      redirectTo: "/login?next=%2Fdashboard",
    }),
    "/login?next=%2Fdashboard",
  );
});

test("falls back to /login when the logout JSON response is missing redirectTo", () => {
  assert.equal(resolveLogoutRedirectPathFromResponseBody({}), "/login");
  assert.equal(resolveLogoutRedirectPathFromResponseBody(null), "/login");
});

test("falls back to /login when the logout JSON response contains an invalid redirectTo", () => {
  assert.equal(
    resolveLogoutRedirectPathFromResponseBody({
      redirectTo: "https://evil.example/login",
    }),
    "/login",
  );
  assert.equal(
    resolveLogoutRedirectPathFromResponseBody({
      redirectTo: "//evil.example/login",
    }),
    "/login",
  );
  assert.equal(
    resolveLogoutRedirectPathFromResponseBody({
      redirectTo: 42,
    }),
    "/login",
  );
});

test("falls back to /login when the logout redirect candidate itself is missing", () => {
  assert.equal(resolveLogoutRedirectPath(undefined), "/login");
});

test("falls back to /login for backslash-based redirect values that normalize into external paths", () => {
  assert.equal(resolveLogoutRedirectPath("/\\evil.example/login"), "/login");
  assert.equal(resolveLogoutRedirectPath("/\\/evil.example/login"), "/login");
  assert.equal(
    resolveLogoutRedirectPathFromResponseBody({
      redirectTo: "/\\\\evil.example/login",
    }),
    "/login",
  );
});

test("preserves valid internal logout redirect paths after normalization", () => {
  assert.equal(
    resolveLogoutRedirectPath("/dashboard/settings?tab=profile#security"),
    "/dashboard/settings?tab=profile#security",
  );
});
