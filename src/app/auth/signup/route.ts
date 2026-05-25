import { NextResponse } from "next/server";

import { isStateChangingAuthRequestAllowed } from "@/lib/auth/origin";
import {
  createSignupAuthRollbackHandler,
  createSignupProfileRepository,
  provisionSignupIdentityProfile,
  SignupProfileProvisionError,
} from "@/lib/auth/signup-profile";
import {
  normalizeSignupValues,
  type SignupFormErrors,
  type SignupFormValues,
  validateSignupValues,
} from "@/lib/auth/signup";
import { getAuthCallbackUrl } from "@/lib/auth/redirects";
import { logger } from "@/lib/logger";
import { createSupabaseAuthDiagnostics } from "@/lib/supabase/auth-diagnostics";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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
const DUPLICATE_SIGNUP_MESSAGE_FRAGMENTS = [
  "already registered",
  "already exists",
  "user already",
];

function getCallbackUrlOrigin(): string | undefined {
  try {
    return new URL(getAuthCallbackUrl()).origin;
  } catch {
    return undefined;
  }
}

function getSignupFailureLogMessage(error: unknown): string {
  return error
    ? "Supabase signup failed with auth error."
    : "Supabase signup returned no user.";
}

function getRequestPath(request: Request): string | undefined {
  try {
    return new URL(request.url).pathname;
  } catch {
    return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSignupValues(body: Record<string, unknown>): SignupFormValues {
  return {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
    confirmPassword:
      typeof body.confirmPassword === "string" ? body.confirmPassword : "",
  };
}

function isDuplicateSignupAttempt(
  message: string | undefined,
  user: { identities?: Array<unknown> | null } | null,
  session: unknown,
): boolean {
  const normalizedMessage = message?.toLowerCase();

  if (
    normalizedMessage &&
    DUPLICATE_SIGNUP_MESSAGE_FRAGMENTS.some((fragment) =>
      normalizedMessage.includes(fragment),
    )
  ) {
    return true;
  }

  // Supabase can return a user object with no identities when signup is
  // obfuscated for an already-registered email instead of surfacing an error.
  return (
    !session && Array.isArray(user?.identities) && user.identities.length === 0
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!isStateChangingAuthRequestAllowed(request)) {
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
  const requestPath = getRequestPath(request);

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json<SignupRouteResponse>(
      {
        error: "Please correct the highlighted fields and try again.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  let supabaseAdminClient: ReturnType<typeof getSupabaseAdminClient>;

  try {
    supabaseAdminClient = getSupabaseAdminClient();
  } catch (error) {
    logger.error("Supabase signup prerequisites failed.", {
      context: "auth",
      source: "auth.signup",
      metadata: {
        requestPath,
      },
      error,
    });

    return NextResponse.json<SignupRouteResponse>(
      {
        error: "Unable to create account right now. Please try again.",
      },
      { status: 500 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
    },
  });

  if (isDuplicateSignupAttempt(error?.message, data.user, data.session)) {
    return NextResponse.json<SignupRouteResponse>(
      { error: DUPLICATE_EMAIL_MESSAGE },
      { status: 409 },
    );
  }

  if (error || !data.user) {
    const diagnostics = await createSupabaseAuthDiagnostics({
      includeAuthSettings: true,
      request,
    });

    logger.error(getSignupFailureLogMessage(error), {
      context: "auth",
      source: "auth.signup",
      metadata: {
        ...diagnostics,
        authErrorCode:
          error && "code" in error && typeof error.code === "string"
            ? error.code
            : undefined,
        authErrorStatus:
          error && "status" in error && typeof error.status === "number"
            ? error.status
            : undefined,
        authResponseHasSession: Boolean(data.session),
        authResponseHasUser: Boolean(data.user),
        callbackUrlOrigin: getCallbackUrlOrigin(),
      },
      error: error ?? "Supabase signup returned no user.",
    });

    return NextResponse.json<SignupRouteResponse>(
      {
        error: "Unable to create account right now. Please try again.",
      },
      { status: 500 },
    );
  }

  try {
    await provisionSignupIdentityProfile({
      profileRepository: createSignupProfileRepository(supabaseAdminClient),
      requestPath,
      rollbackAuthUser: createSignupAuthRollbackHandler(supabaseAdminClient),
      userId: data.user.id,
    });
  } catch (error) {
    if (!(error instanceof SignupProfileProvisionError)) {
      logger.error("Identity profile provisioning failed after auth signup.", {
        context: "auth",
        source: "auth.signup",
        metadata: {
          requestPath,
          userId: data.user.id,
        },
        error,
      });
    }

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
