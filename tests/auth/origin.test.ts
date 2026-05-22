import assert from "node:assert/strict";
import test from "node:test";

import {
  isRequestOriginAllowed,
  isStateChangingAuthRequestAllowed,
} from "../../src/lib/auth/origin";

test("allows same-origin auth requests when the origin header matches", () => {
  const request = new Request("https://example.com/auth/login", {
    method: "POST",
    headers: {
      origin: "https://example.com",
    },
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), true);
});

test("allows same-origin auth requests when only the referer header matches", () => {
  const request = new Request("https://example.com/auth/signup", {
    method: "POST",
    headers: {
      referer: "https://example.com/signup?plan=pro",
    },
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), true);
});

test("rejects state-changing auth requests without origin metadata", () => {
  const request = new Request("https://example.com/auth/logout", {
    method: "POST",
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), false);
});

test("retains optional missing-header behavior for non-auth callers", () => {
  assert.equal(
    isRequestOriginAllowed("https://example.com/api/monitoring/web-vitals", null, null),
    true,
  );
});
