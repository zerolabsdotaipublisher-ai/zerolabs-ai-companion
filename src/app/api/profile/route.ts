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
  ensureIdentityProfileForUser,
  updateIdentityProfileByUserId,
} from "@/lib/identity/profile";
import {
  getCompanionPreferencesFromProfilePreferences,
  normalizeCompanionPreferencesInput,
  setCompanionPreferencesOnProfilePreferences,
} from "@/lib/identity/preferences";
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
    companion_tone: typeof body.companion_tone === "string" ? body.companion_tone : "",
    suggestion_style: typeof body.suggestion_style === "string" ? body.suggestion_style : "",
    activity_intensity:
      typeof body.activity_intensity === "string" ? body.activity_intensity : "",
    preferred_time_of_day:
      typeof body.preferred_time_of_day === "string" ? body.preferred_time_of_day : "",
    location_preference:
      typeof body.location_preference === "string" ? body.location_preference : "",
    interests: typeof body.interests === "string" ? body.interests : "",
    avoidances: typeof body.avoidances === "string" ? body.avoidances : "",
  };
}

async function getAuthenticatedProfileResponse(): Promise<Response> {
  const authState = await getServerAuthState();

  if (!hasAuthenticatedServerSession(authState)) {
    return NextResponse.json<ProfileRouteResponse>(
      { error: "You must be signed in to manage your profile." },
      { status: 401 },
    );
  }

  try {
    const profile = await ensureIdentityProfileForUser(authState.user.id);

    return NextResponse.json<ProfileRouteResponse>({
      profile: toIdentityProfileFormValues(profile),
    });
  } catch (error) {
    logger.error("Identity profile lookup request failed.", {
      context: "identity",
      source: "api.profile",
      metadata: {
        userId: authState.user.id,
      },
      error,
    });

    return NextResponse.json<ProfileRouteResponse>(
      { error: "We couldn’t load your profile right now. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<Response> {
  return getAuthenticatedProfileResponse();
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
    const currentProfile = await ensureIdentityProfileForUser(authState.user.id);
    const currentCompanionPreferences = getCompanionPreferencesFromProfilePreferences(
      currentProfile.preferences,
    );
    const normalizedCompanionPreferences = normalizeCompanionPreferencesInput(
      updateValues.data.companionPreferences,
      currentCompanionPreferences,
    );

    if (!normalizedCompanionPreferences.data) {
      return NextResponse.json<ProfileRouteResponse>(
        {
          error: "Please correct the highlighted profile fields.",
          fieldErrors: normalizedCompanionPreferences.fieldErrors as IdentityProfileFormErrors,
        },
        { status: 400 },
      );
    }

    const updatedProfile = await updateIdentityProfileByUserId({
      authenticatedUserId: authState.user.id,
      requestedUserId: authState.user.id,
      repository: createIdentityProfileRepository(authState.supabase),
      values: {
        ...updateValues.data.identity,
        personalization: currentProfile.personalization,
        preferences: setCompanionPreferencesOnProfilePreferences(
          currentProfile.preferences,
          normalizedCompanionPreferences.data,
        ),
      },
    });

    return NextResponse.json<ProfileRouteResponse>({
      message: "Profile saved.",
      profile: toIdentityProfileFormValues(updatedProfile),
    });
  } catch (error) {
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
