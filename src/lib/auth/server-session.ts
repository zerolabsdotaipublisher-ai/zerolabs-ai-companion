import "server-only";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import {
  buildAuthEntryRedirectPath,
  buildSearchParamsString,
  type RouteSearchParams,
} from "./session-persistence";
import { AUTH_ENTRY_REDIRECT } from "./redirects";

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
  authEntryPath = AUTH_ENTRY_REDIRECT,
}: ProtectedRouteOptions): string {
  return buildAuthEntryRedirectPath(pathname, normalizeSearch(searchParams), authEntryPath);
}

export function hasAuthenticatedServerSession<
  T extends {
    session: Session | null;
    user: User | null;
  },
>(value: T): value is T & { session: Session; user: User } {
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
