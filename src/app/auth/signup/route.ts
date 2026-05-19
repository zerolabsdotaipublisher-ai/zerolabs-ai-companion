import { NextResponse } from "next/server";

import {
  normalizeSignupValues,
  type SignupFormErrors,
  type SignupFormValues,
  validateSignupValues,
} from "@/lib/auth/signup";
import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SignupRouteResponse = {
  error?: string;
  fieldErrors?: SignupFormErrors;
  message?: string;
  redirectTo?: string;
};

const DUPLICATE_EMAIL_MESSAGE =
  "An account with this email already exists. Please log in instead.";
const SIGNUP_SUCCESS_MESSAGE =
  "Account created. Check your email for a confirmation link, then continue in the app.";
const SIGNUP_SUCCESS_REDIRECT = "/";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function toSignupValues(body: Record<string, unknown>): SignupFormValues {
  return {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
    confirmPassword: typeof body.confirmPassword === "string" ? body.confirmPassword : "",
  };
}

function isDuplicateSignupAttempt(
  message: string | undefined,
  user: { identities?: Array<unknown> | null } | null,
): boolean {
  if (message && /already registered|already exists|user already/i.test(message)) {
    return true;
  }

  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export async function POST(request: Request): Promise<Response> {
  if (!isValidOrigin(request)) {
    return NextResponse.json<SignupRouteResponse>(
      { error: "Origin is not allowed." },
      { status: 403 },
    );
  }

  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json<SignupRouteResponse>(
      { error: "Invalid signup request." },
      { status: 400 },
    );
  }

  if (!isPlainObject(parsedBody)) {
    return NextResponse.json<SignupRouteResponse>(
      { error: "Invalid signup request." },
      { status: 400 },
    );
  }

  const values = normalizeSignupValues(toSignupValues(parsedBody));
  const fieldErrors = validateSignupValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json<SignupRouteResponse>(
      {
        error: "Please correct the highlighted fields and try again.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
  });

  if (isDuplicateSignupAttempt(error?.message, data.user)) {
    return NextResponse.json<SignupRouteResponse>(
      { error: DUPLICATE_EMAIL_MESSAGE },
      { status: 409 },
    );
  }

  if (error || !data.user) {
    logger.error("Supabase signup failed.", {
      context: "auth",
      source: "auth.signup",
      error: error ?? "Supabase signup returned no user.",
    });

    return NextResponse.json<SignupRouteResponse>(
      {
        error: "Unable to create account right now. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json<SignupRouteResponse>({
    message: SIGNUP_SUCCESS_MESSAGE,
    redirectTo: SIGNUP_SUCCESS_REDIRECT,
  });
}
