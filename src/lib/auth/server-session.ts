import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import {
  buildAuthEntryRedirectPath,
  buildSearchParamsString,
  type RouteSearchParams,
} from "./session-persistence";

const DEFAULT_AUTH_ENTRY_REDIRECT = "/login";

export type ServerAuthState = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
};

export type AuthenticatedServerAuthState = ServerAuthState & {
  session: Session;
  user: User;
};

export type ProtectedRouteOptions = {
  pathname: string;
  searchParams?: RouteSearchParams | string;
  authEntryPath?: string;
};

function normalizeSearch(searchParams: RouteSearchParams | string | undefined): string {
  if (!searchParams) {
    return "";
  }

  if (typeof searchParams === "string") {
    if (searchParams.length === 0) {
      return "";
    }

    return searchParams.startsWith("?") ? searchParams : `?${searchParams}`;
  }

  return buildSearchParamsString(searchParams);
}

export function buildServerAuthRedirectPath({
  pathname,
  searchParams,
  authEntryPath = DEFAULT_AUTH_ENTRY_REDIRECT,
}: ProtectedRouteOptions): string {
  return buildAuthEntryRedirectPath(pathname, normalizeSearch(searchParams), authEntryPath);
}

export function hasAuthenticatedServerSession(
  value: Pick<ServerAuthState, "session" | "user">,
): value is AuthenticatedServerAuthState {
  return value.session !== null && value.user !== null;
}

const getCachedServerAuthState = cache(async (): Promise<ServerAuthState> => {
  const [{ logger }, { getSupabaseServerClient }] = await Promise.all([
    import("../logger"),
    import("../supabase/server"),
  ]);
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Supabase server user lookup failed.", {
      context: "auth",
      source: "auth.server-session",
      error: userError,
    });
  }

  if (!user) {
    return {
      supabase,
      session: null,
      user: null,
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    logger.warn("Supabase server session lookup failed.", {
      context: "auth",
      source: "auth.server-session",
      error: sessionError,
    });
  }

  if (!session) {
    return {
      supabase,
      session: null,
      user: null,
    };
  }

  return {
    supabase,
    session: { ...session, user },
    user,
  };
});

export async function getServerAuthState(): Promise<ServerAuthState> {
  return getCachedServerAuthState();
}

export async function getServerSession(): Promise<Session | null> {
  const authState = await getCachedServerAuthState();
  return authState.session;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const authState = await getCachedServerAuthState();
  return authState.user;
}
