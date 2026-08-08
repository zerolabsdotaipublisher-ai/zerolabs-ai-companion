import type { AuthChangeEvent } from "@supabase/supabase-js";

import {
  AUTHENTICATED_APP_REDIRECT,
  AUTH_ENTRY_REDIRECT,
  LOGIN_REDIRECT,
  SIGNUP_REDIRECT,
} from "@/lib/auth/redirects";
import {
  buildAuthEntryRedirectPath,
  isProtectedAppRoute,
  normalizeAuthPathname,
} from "@/lib/auth/session-persistence";

export type ClientAuthStatus = "authenticated" | "unauthenticated";

export type ClientAuthTransitionResult = {
  nextStatus: ClientAuthStatus;
  redirectTo: string | null;
  shouldRefresh: boolean;
};

type ResolveClientAuthTransitionOptions = {
  currentPathname: string;
  currentSearch?: string;
  event: AuthChangeEvent;
  hasSession: boolean;
  previousStatus: ClientAuthStatus;
};

const AUTH_ENTRY_ROUTES = new Set([LOGIN_REDIRECT, SIGNUP_REDIRECT, "/logout"]);

export function getClientAuthStatus(hasSession: boolean): ClientAuthStatus {
  return hasSession ? "authenticated" : "unauthenticated";
}

export function resolveClientAuthTransition({
  currentPathname,
  currentSearch = "",
  event,
  hasSession,
  previousStatus,
}: ResolveClientAuthTransitionOptions): ClientAuthTransitionResult {
  const nextStatus = getClientAuthStatus(hasSession);
  const normalizedPathname = normalizeAuthPathname(currentPathname);
  const hasStatusChanged = nextStatus !== previousStatus;
  const shouldRefreshForEvent = event !== "INITIAL_SESSION";

  if (nextStatus === "unauthenticated" && isProtectedAppRoute(normalizedPathname)) {
    return {
      nextStatus,
      redirectTo: buildAuthEntryRedirectPath(
        currentPathname,
        currentSearch,
        AUTH_ENTRY_REDIRECT,
      ),
      shouldRefresh: true,
    };
  }

  if (nextStatus === "authenticated" && AUTH_ENTRY_ROUTES.has(normalizedPathname)) {
    return {
      nextStatus,
      redirectTo: AUTHENTICATED_APP_REDIRECT,
      shouldRefresh: true,
    };
  }

  if (event === "INITIAL_SESSION" && !hasStatusChanged) {
    return {
      nextStatus,
      redirectTo: null,
      shouldRefresh: false,
    };
  }

  return {
    nextStatus,
    redirectTo: null,
    shouldRefresh: hasStatusChanged || shouldRefreshForEvent,
  };
}
