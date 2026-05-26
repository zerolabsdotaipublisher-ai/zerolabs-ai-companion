import { NextResponse } from "next/server";

import {
  hasAuthenticatedServerSession,
  getServerAuthState,
} from "@/lib/auth/server-session";
import { isStateChangingAuthRequestAllowed } from "@/lib/auth/origin";
import {
  buildIdentityProfileUpdateValues,
  toIdentityProfileFormValues,
  type IdentityProfileFormErrors,
  type IdentityProfileFormValues,
} from "@/lib/identity/profile-form";
import {
  createIdentityProfileRepository,
  IDENTITY_PROFILE_NOT_FOUND_ERROR_MESSAGE,
  updateIdentityProfileByUserId,
} from "@/lib/identity/profile";
import { logger } from "@/lib/logger";

type ProfileRouteResponse = {
  error?: string;
  fieldErrors?: IdentityProfileFormErrors;
  message?: string;
  profile?: IdentityProfileFormValues;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toIdentityProfileFormRequestValues(body: Record<string, unknown>): IdentityProfileFormValues {
  return {
    display_name: typeof body.display_name === "string" ? body.display_name : "",
    preferred_name: typeof body.preferred_name === "string" ? body.preferred_name : "",
    timezone: typeof body.timezone === "string" ? body.timezone : "",
    locale: typeof body.locale === "string" ? body.locale : "",
    personalization: typeof body.personalization === "string" ? body.personalization : "",
    preferences: typeof body.preferences === "string" ? body.preferences : "",
  };
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isStateChangingAuthRequestAllowed(request)) {
    return NextResponse.json<ProfileRouteResponse>(
      { error: "Origin metadata is missing or not allowed." },
      { status: 403 },
    );
  }

  const authState = await getServerAuthState();

  if (!hasAuthenticatedServerSession(authState)) {
    return NextResponse.json<ProfileRouteResponse>(
      { error: "You must be signed in to update your profile." },
      { status: 401 },
    );
  }

  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json<ProfileRouteResponse>(
      { error: "Invalid profile request." },
      { status: 400 },
    );
  }

  if (!isPlainObject(parsedBody)) {
    return NextResponse.json<ProfileRouteResponse>(
      { error: "Invalid profile request." },
      { status: 400 },
    );
  }

  const updateValues = buildIdentityProfileUpdateValues(
    toIdentityProfileFormRequestValues(parsedBody),
  );

  if (!updateValues.data) {
    return NextResponse.json<ProfileRouteResponse>(
      {
        error: "Please correct the highlighted profile fields.",
        fieldErrors: updateValues.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const updatedProfile = await updateIdentityProfileByUserId({
      authenticatedUserId: authState.user.id,
      requestedUserId: authState.user.id,
      repository: createIdentityProfileRepository(authState.supabase),
      values: updateValues.data,
    });

    return NextResponse.json<ProfileRouteResponse>({
      message: "Profile saved.",
      profile: toIdentityProfileFormValues(updatedProfile),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === IDENTITY_PROFILE_NOT_FOUND_ERROR_MESSAGE
    ) {
      return NextResponse.json<ProfileRouteResponse>(
        { error: "We couldn’t find your profile right now. Please try again shortly." },
        { status: 404 },
      );
    }

    logger.error("Identity profile update request failed.", {
      context: "identity",
      source: "api.profile",
      metadata: {
        userId: authState.user.id,
      },
      error,
    });

    return NextResponse.json<ProfileRouteResponse>(
      { error: "We couldn’t save your profile right now. Please try again." },
      { status: 500 },
    );
  }
}
