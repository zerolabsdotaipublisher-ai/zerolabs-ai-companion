import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_CALLBACK_PATH,
  AUTHENTICATED_APP_REDIRECT,
  AUTH_SUCCESS_REDIRECT,
  getAuthCallbackUrl,
} from "../../src/lib/auth/redirects";

test("builds auth callback URLs from the active request origin", () => {
  assert.equal(
    getAuthCallbackUrl("https://preview-123.vercel.app/auth/signup"),
    "https://preview-123.vercel.app/auth/callback",
  );
});

test("falls back to the configured app URL for invalid callback request URLs", () => {
  assert.equal(getAuthCallbackUrl("not a url"), `https://example.com${AUTH_CALLBACK_PATH}`);
});

test("uses the authenticated app route after successful auth callbacks", () => {
  assert.equal(AUTH_SUCCESS_REDIRECT, AUTHENTICATED_APP_REDIRECT);
});
