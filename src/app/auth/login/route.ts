import { NextResponse } from "next/server";

import {
  normalizeLoginValues,
  type LoginFormErrors,
  type LoginFormValues,
  validateLoginValues,
} from "@/lib/auth/login";
import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";
import { logger } from "@/lib/logger";
import { createSupabaseAuthDiagnostics } from "@/lib/supabase/auth-diagnostics";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type LoginRouteResponse = {
  error?: string;
  fieldErrors?: LoginFormErrors;
  redirectTo?: string;
  safeUserMessage?: boolean;
};

const INVALID_CREDENTIALS_MESSAGE =
  "Incorrect email or password. Please try again.";
const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Confirm your email before logging in, then try again.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLoginFailureLogMessage(error: unknown, hasSession: boolean): string {
  if (error) {
    return "Supabase login failed with auth error.";
  }

  if (!hasSession) {
    return "Supabase login returned no session.";
  }

  return "Supabase login failed.";
}

function isValidOrigin(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  if (originHeader) {
    try {
      if (new URL(originHeader).origin !== requestOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (refererHeader) {
    try {
      if (new URL(refererHeader).origin !== requestOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

function toLoginValues(body: Record<string, unknown>): LoginFormValues {
  return {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}

function isInvalidCredentialsError(message: string | undefined): boolean {
  return (message ?? "").toLowerCase().includes("invalid login credentials");
}

function isEmailNotConfirmedError(message: string | undefined): boolean {
  return (message ?? "").toLowerCase().includes("email not confirmed");
}

export async function POST(request: Request): Promise<Response> {
  if (!isValidOrigin(request)) {
    return NextResponse.json<LoginRouteResponse>(
      { error: "Origin is not allowed." },
      { status: 403 },
    );
  }

  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json<LoginRouteResponse>(
      { error: "Invalid login request." },
      { status: 400 },
    );
  }

  if (!isPlainObject(parsedBody)) {
    return NextResponse.json<LoginRouteResponse>(
      { error: "Invalid login request." },
      { status: 400 },
    );
  }

  const values = normalizeLoginValues(toLoginValues(parsedBody));
  const fieldErrors = validateLoginValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json<LoginRouteResponse>(
      {
        error: "Please enter your email and password.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (isInvalidCredentialsError(error?.message)) {
    return NextResponse.json<LoginRouteResponse>(
      { error: INVALID_CREDENTIALS_MESSAGE },
      { status: 401 },
    );
  }

  if (isEmailNotConfirmedError(error?.message)) {
    return NextResponse.json<LoginRouteResponse>(
      {
        error: EMAIL_NOT_CONFIRMED_MESSAGE,
        safeUserMessage: true,
      },
      { status: 403 },
    );
  }

  if (error || !data.session) {
    const diagnostics = await createSupabaseAuthDiagnostics({
      includeAuthSettings: true,
      request,
    });

    logger.error(getLoginFailureLogMessage(error, Boolean(data.session)), {
      context: "auth",
      source: "auth.login",
      metadata: {
        ...diagnostics,
        authErrorCode:
          error && "code" in error && typeof error.code === "string" ? error.code : undefined,
        authErrorStatus:
          error && "status" in error && typeof error.status === "number"
            ? error.status
            : undefined,
        authResponseHasSession: Boolean(data.session),
        authResponseHasUser: Boolean(data.user),
      },
      error: error ?? { message: "Supabase login returned no session." },
    });

    return NextResponse.json<LoginRouteResponse>(
      { error: "Unable to log in right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json<LoginRouteResponse>({
    redirectTo: AUTHENTICATED_APP_REDIRECT,
  });
}
