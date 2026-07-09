import assert from "node:assert/strict";
import test from "node:test";

import {
  getStateChangingAuthHeaders,
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

test("allows same-origin auth requests when fetch metadata marks them same-origin", () => {
  const request = new Request("https://example.com/auth/logout", {
    method: "POST",
    headers: {
      "sec-fetch-site": "same-origin",
    },
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), true);
});

test("allows state-changing auth requests with the trusted client header", () => {
  const request = new Request("https://example.com/auth/login", {
    method: "POST",
    headers: getStateChangingAuthHeaders(),
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), true);
});

test("allows same-origin auth requests when the trusted client header accompanies matching origin metadata", () => {
  const request = new Request("https://example.com/auth/logout", {
    method: "POST",
    headers: {
      ...getStateChangingAuthHeaders(),
      origin: "https://example.com",
    },
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), true);
});

test("allows auth requests that match the configured canonical app origin in proxy deployments", () => {
  const request = new Request("https://internal.vercel.local/auth/logout", {
    method: "POST",
    headers: {
      origin: "https://example.com",
    },
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), true);
});

test("allows forwarded auth origins only when explicitly trusted", () => {
  const requestHeaders = new Headers({
    "x-forwarded-host": "127.0.0.1:3000",
    "x-forwarded-proto": "http",
  });

  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://127.0.0.1:3000", null, {
      requireHeaders: true,
      requestHeaders,
    }),
    false,
  );
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://127.0.0.1:3000", null, {
      requireHeaders: true,
      requestHeaders,
      trustForwardedOrigin: true,
    }),
    true,
  );
});

test("rejects spoofed x-forwarded-host metadata", () => {
  assert.equal(
    isRequestOriginAllowed("https://example.com/auth/logout", "https://example.com", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      }),
    }),
    false,
  );
});

test("rejects spoofed x-forwarded-proto metadata", () => {
  assert.equal(
    isRequestOriginAllowed("https://example.com/auth/logout", "https://example.com", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "example.com",
        "x-forwarded-proto": "http",
      }),
    }),
    false,
  );
});

test("rejects malformed forwarded metadata", () => {
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "bad host",
        "x-forwarded-proto": "javascript",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "example.com:3000:extra",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
});

test("rejects forwarded host values containing a scheme", () => {
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "http://example.com",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
});

test("rejects forwarded host values containing path, query, or fragment data", () => {
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "example.com/path",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "example.com?next=/dashboard",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "example.com#fragment",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
});

test("rejects forwarded host values containing username or password", () => {
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "bad@host",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "user:password@example.com",
        "x-forwarded-proto": "http",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
});

test("rejects invalid forwarded proto values even when the origin header is otherwise same-origin", () => {
  assert.equal(
    isRequestOriginAllowed("http://localhost:3000/auth/logout", "http://localhost:3000", null, {
      requireHeaders: true,
      requestHeaders: new Headers({
        "x-forwarded-host": "localhost:3000",
        "x-forwarded-proto": "javascript",
      }),
      trustForwardedOrigin: true,
    }),
    false,
  );
});

test("rejects cross-origin auth requests even when the trusted client header is present", () => {
  const request = new Request("https://example.com/auth/logout", {
    method: "POST",
    headers: {
      ...getStateChangingAuthHeaders(),
      referer: "https://evil.example/logout",
    },
  });

  assert.equal(isStateChangingAuthRequestAllowed(request), false);
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
