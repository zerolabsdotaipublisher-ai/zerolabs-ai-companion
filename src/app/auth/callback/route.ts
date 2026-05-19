import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_SUCCESS_REDIRECT,
  LOGIN_REDIRECT,
  SIGNUP_REDIRECT,
  type AuthCallbackError,
} from "@/lib/auth/redirects";
import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getFailureRedirectPath(request: NextRequest): string {
  return request.nextUrl.searchParams.get("type") === "signup"
    ? SIGNUP_REDIRECT
    : LOGIN_REDIRECT;
}

function getSafeErrorParam(request: NextRequest): AuthCallbackError {
  const errorCode = request.nextUrl.searchParams.get("error_code")?.toLowerCase();
  const error = request.nextUrl.searchParams.get("error")?.toLowerCase();

  if (errorCode?.includes("expired") || error?.includes("expired")) {
    return "link_expired";
  }

  return "verification_failed";
}

function buildRedirectUrl(
  request: NextRequest,
  pathname: string,
  error?: AuthCallbackError,
): URL {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  if (error) {
    redirectUrl.searchParams.set("error", error);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get("code");
  const failureRedirectPath = getFailureRedirectPath(request);

  if (!code) {
    return NextResponse.redirect(
      buildRedirectUrl(request, failureRedirectPath, getSafeErrorParam(request)),
    );
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn("Supabase auth callback code exchange failed.", {
      context: "auth",
      source: "auth.callback",
      metadata: {
        authType: request.nextUrl.searchParams.get("type") ?? undefined,
        errorCode: request.nextUrl.searchParams.get("error_code") ?? undefined,
      },
      error,
    });

    return NextResponse.redirect(
      buildRedirectUrl(request, failureRedirectPath, getSafeErrorParam(request)),
    );
  }

  return NextResponse.redirect(buildRedirectUrl(request, AUTH_SUCCESS_REDIRECT));
}
