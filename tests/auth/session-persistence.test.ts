import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthEntryRedirectPath,
  getSupabaseSessionCookieNames,
  isPublicAuthRoute,
  isStaticAssetPathname,
} from "../../src/lib/auth/session-persistence";

test("detects Supabase session cookies, including chunked cookies used for logout cleanup", () => {
  const cookieNames = getSupabaseSessionCookieNames([
    { name: "sb-project-ref-auth-token" },
    { name: "sb-project-ref-auth-token.0" },
    { name: "__Host-sb-project-ref-auth-token.1" },
    { name: "sb-project-ref-auth-token.1" },
    { name: "sb-project-ref-code-verifier" },
    { name: "next-url" },
  ]);

  assert.deepEqual(cookieNames, [
    "sb-project-ref-auth-token",
    "sb-project-ref-auth-token.0",
    "__Host-sb-project-ref-auth-token.1",
    "sb-project-ref-auth-token.1",
  ]);
});

test("treats login and auth endpoints as public while keeping protected routes guarded", () => {
  assert.equal(isPublicAuthRoute("/login/"), true);
  assert.equal(isPublicAuthRoute("/auth/logout"), true);
  assert.equal(isPublicAuthRoute("/dashboard"), false);
  assert.equal(
    buildAuthEntryRedirectPath("/dashboard", "?tab=account", "/login"),
    "/login?next=%2Fdashboard%3Ftab%3Daccount",
  );
});

test("skips static assets from auth protection checks", () => {
  assert.equal(isStaticAssetPathname("/_next/static/chunks/main.js"), true);
  assert.equal(isStaticAssetPathname("/favicon.ico"), true);
  assert.equal(isStaticAssetPathname("/images/logo.png"), true);
  assert.equal(isStaticAssetPathname("/dashboard"), false);
});
