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
  parseCompanionPreferenceList,
  setCompanionPreferencesOnProfilePreferences,
  type CompanionPreferencesUpdateInput,
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

function hasOwn(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function toIdentityProfileFormRequestValues(
  body: Record<string, unknown>,
  fallbackValues: IdentityProfileFormValues,
): IdentityProfileFormValues {
  return {
    display_name:
      typeof body.display_name === "string" ? body.display_name : fallbackValues.display_name,
    preferred_name:
      typeof body.preferred_name === "string"
        ? body.preferred_name
        : fallbackValues.preferred_name,
    timezone: typeof body.timezone === "string" ? body.timezone : fallbackValues.timezone,
    locale: typeof body.locale === "string" ? body.locale : fallbackValues.locale,
    companion_tone:
      typeof body.companion_tone === "string"
        ? body.companion_tone
        : fallbackValues.companion_tone,
    suggestion_style:
      typeof body.suggestion_style === "string"
        ? body.suggestion_style
        : fallbackValues.suggestion_style,
    activity_intensity:
      typeof body.activity_intensity === "string"
        ? body.activity_intensity
        : fallbackValues.activity_intensity,
    preferred_time_of_day:
      typeof body.preferred_time_of_day === "string"
        ? body.preferred_time_of_day
        : fallbackValues.preferred_time_of_day,
    location_preference:
      typeof body.location_preference === "string"
        ? body.location_preference
        : fallbackValues.location_preference,
    interests: typeof body.interests === "string" ? body.interests : fallbackValues.interests,
    avoidances: typeof body.avoidances === "string" ? body.avoidances : fallbackValues.avoidances,
  };
}

function toCompanionPreferencesUpdateInput(
  body: Record<string, unknown>,
): CompanionPreferencesUpdateInput {
  const input: CompanionPreferencesUpdateInput = {};

  if (hasOwn(body, "companion_tone")) {
    input.companion_tone = body.companion_tone as CompanionPreferencesUpdateInput["companion_tone"];
  }

  if (hasOwn(body, "suggestion_style")) {
    input.suggestion_style =
      body.suggestion_style as CompanionPreferencesUpdateInput["suggestion_style"];
  }

  if (hasOwn(body, "activity_intensity")) {
    input.activity_intensity =
      body.activity_intensity as CompanionPreferencesUpdateInput["activity_intensity"];
  }

  if (hasOwn(body, "preferred_time_of_day")) {
    input.preferred_time_of_day =
      body.preferred_time_of_day as CompanionPreferencesUpdateInput["preferred_time_of_day"];
  }

  if (hasOwn(body, "location_preference")) {
    input.location_preference =
      body.location_preference as CompanionPreferencesUpdateInput["location_preference"];
  }

  if (hasOwn(body, "interests")) {
    input.interests =
      typeof body.interests === "string"
        ? parseCompanionPreferenceList(body.interests)
        : (body.interests as CompanionPreferencesUpdateInput["interests"]);
  }

  if (hasOwn(body, "avoidances")) {
    input.avoidances =
      typeof body.avoidances === "string"
        ? parseCompanionPreferenceList(body.avoidances)
        : (body.avoidances as CompanionPreferencesUpdateInput["avoidances"]);
  }

  return input;
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

  try {
    const currentProfile = await ensureIdentityProfileForUser(authState.user.id);
    const requestValues = toIdentityProfileFormRequestValues(
      parsedBody,
      toIdentityProfileFormValues(currentProfile),
    );
    const updateValues = buildIdentityProfileUpdateValues(requestValues);

    if (!updateValues.data) {
      return NextResponse.json<ProfileRouteResponse>(
        {
          error: "Please correct the highlighted profile fields.",
          fieldErrors: updateValues.fieldErrors,
        },
        { status: 400 },
      );
    }

    const currentCompanionPreferences = getCompanionPreferencesFromProfilePreferences(
      currentProfile.preferences,
    );
    const normalizedCompanionPreferences = normalizeCompanionPreferencesInput(
      toCompanionPreferencesUpdateInput(parsedBody),
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
