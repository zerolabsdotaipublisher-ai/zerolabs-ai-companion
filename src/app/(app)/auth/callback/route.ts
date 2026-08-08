import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_ENTRY_REDIRECT,
  AUTH_SUCCESS_REDIRECT,
  SIGNUP_REDIRECT,
  type AuthCallbackError,
} from "@/lib/auth/redirects";
import { resolvePostAuthRedirectPath } from "@/lib/auth/session-persistence";
import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getFailureRedirectPath(request: NextRequest): string {
  return request.nextUrl.searchParams.get("type") === "signup"
    ? SIGNUP_REDIRECT
    : AUTH_ENTRY_REDIRECT;
}

function isExpiredAuthError(value: string | undefined): boolean {
  return /(^|[_-])expired([_-]|$)/.test(value ?? "");
}

function determineAuthErrorType(request: NextRequest): AuthCallbackError {
  const errorCode = request.nextUrl.searchParams.get("error_code")?.toLowerCase();
  const error = request.nextUrl.searchParams.get("error")?.toLowerCase();

  if (isExpiredAuthError(errorCode) || isExpiredAuthError(error)) {
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

function getSuccessRedirectPath(request: NextRequest): string {
  return resolvePostAuthRedirectPath(
    request.nextUrl.searchParams.get("next"),
    AUTH_SUCCESS_REDIRECT,
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get("code");
  const failureRedirectPath = getFailureRedirectPath(request);

  if (!code) {
    return NextResponse.redirect(
      buildRedirectUrl(request, failureRedirectPath, determineAuthErrorType(request)),
    );
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn("Failed to exchange auth callback code for session.", {
      context: "auth",
      source: "auth.callback",
      metadata: {
        authType: request.nextUrl.searchParams.get("type") ?? undefined,
        errorCode: request.nextUrl.searchParams.get("error_code") ?? undefined,
      },
      error,
    });

    return NextResponse.redirect(
      buildRedirectUrl(request, failureRedirectPath, determineAuthErrorType(request)),
    );
  }

  return NextResponse.redirect(buildRedirectUrl(request, getSuccessRedirectPath(request)));
}
