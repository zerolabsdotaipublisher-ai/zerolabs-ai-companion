import assert from "node:assert/strict";
import test from "node:test";
import type { Session, User } from "@supabase/supabase-js";

import {
  buildServerAuthRedirectPath,
  hasAuthenticatedServerSession,
} from "../../src/lib/auth/server-session";

test("builds login redirects for protected server routes with normalized search params", () => {
  assert.equal(
    buildServerAuthRedirectPath({
      pathname: "/dashboard",
      searchParams: {
        tab: "account",
        filter: ["open", "assigned"],
      },
    }),
    "/login?next=%2Fdashboard%3Ftab%3Daccount%26filter%3Dopen%26filter%3Dassigned",
  );

  assert.equal(
    buildServerAuthRedirectPath({
      pathname: "/dashboard",
      searchParams: "tab=account",
    }),
    "/login?next=%2Fdashboard%3Ftab%3Daccount",
  );
});

test("treats only a validated user and session pair as an authenticated server session", () => {
  const user: User = {
    id: "user-123",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  const session: Session = {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: "bearer",
    user,
  };

  assert.equal(hasAuthenticatedServerSession({ session: null, user: null }), false);
  assert.equal(hasAuthenticatedServerSession({ session: null, user }), false);
  assert.equal(hasAuthenticatedServerSession({ session, user: null }), false);
  assert.equal(hasAuthenticatedServerSession({ session, user }), true);
});
