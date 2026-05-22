import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isStateChangingAuthRequestAllowed } from "@/lib/auth/origin";
import { AUTH_ENTRY_REDIRECT } from "@/lib/auth/redirects";
import {
  getSupabaseSessionCookieNames,
  type CookieName,
} from "@/lib/auth/session-persistence";
import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function clearSessionCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  sessionCookies: ReadonlyArray<CookieName>,
): void {
  for (const name of getSupabaseSessionCookieNames(sessionCookies)) {
    cookieStore.delete(name);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isStateChangingAuthRequestAllowed(request)) {
    return NextResponse.json(
      { error: "Origin metadata is missing or not allowed" },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll();
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.warn("Supabase logout failed during server-side sign out.", {
      context: "auth",
      source: "auth.logout",
      error,
    });
  }

  clearSessionCookies(cookieStore, sessionCookies);

  return NextResponse.redirect(new URL(AUTH_ENTRY_REDIRECT, request.url), {
    status: 303,
  });
}
