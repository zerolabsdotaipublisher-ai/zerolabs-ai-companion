import "server-only";

import { getServerAuthState } from "@/lib/auth/server-session";
import {
  buildIdentityProfileUpsertValues,
  createIdentityProfileRepository,
  isIdentityProfileAccessAllowed,
  type IdentityProfileRepository,
} from "@/lib/identity/profile";
import type { IdentityProfileEditableValues, IdentityProfileRecord } from "@/lib/identity/types";
import { logger } from "@/lib/logger";

import {
  createDefaultCompanionPreferences,
  getCompanionPreferencesFromProfilePreferences,
  normalizeCompanionPreferencesInput,
  setCompanionPreferencesOnProfilePreferences,
  type CompanionPreferences,
  type CompanionPreferencesUpdateInput,
  type CompanionPreferencesValidationErrors,
} from "./preferences";

export class InvalidCompanionPreferencesError extends Error {
  readonly fieldErrors: CompanionPreferencesValidationErrors;

  constructor(fieldErrors: CompanionPreferencesValidationErrors) {
    super("Companion preferences are invalid.");
    this.name = "InvalidCompanionPreferencesError";
    this.fieldErrors = fieldErrors;
  }
}

function assertIdentityProfileAccess(
  authenticatedUserId: string | null | undefined,
  requestedUserId: string,
): void {
  if (!isIdentityProfileAccessAllowed(authenticatedUserId, requestedUserId)) {
    throw new Error("Identity profile access is limited to the authenticated user.");
  }
}

function buildEditableValues(
  profile: IdentityProfileRecord,
  preferences: IdentityProfileRecord["preferences"],
): IdentityProfileEditableValues {
  return {
    display_name: profile.display_name,
    preferred_name: profile.preferred_name,
    timezone: profile.timezone,
    locale: profile.locale,
    personalization: profile.personalization,
    preferences,
  };
}

async function ensureIdentityProfileRecordByUserId({
  authenticatedUserId,
  requestedUserId,
  repository,
}: {
  authenticatedUserId: string | null | undefined;
  requestedUserId: string;
  repository: IdentityProfileRepository;
}): Promise<IdentityProfileRecord> {
  assertIdentityProfileAccess(authenticatedUserId, requestedUserId);

  const existingProfileResult = await repository.getByUserId(requestedUserId);

  if (existingProfileResult.error) {
    logger.warn("Identity profile lookup failed while ensuring companion preferences.", {
      context: "identity",
      source: "identity.preferences",
      error: existingProfileResult.error,
      metadata: { userId: requestedUserId },
    });
    throw existingProfileResult.error;
  }

  if (existingProfileResult.data) {
    return existingProfileResult.data;
  }

  const createProfileResult = await repository.upsert(
    buildIdentityProfileUpsertValues(requestedUserId),
  );

  if (createProfileResult.error || !createProfileResult.data) {
    logger.warn("Identity profile creation failed while ensuring companion preferences.", {
      context: "identity",
      source: "identity.preferences",
      error:
        createProfileResult.error ?? "Identity profile creation returned no data.",
      metadata: { userId: requestedUserId },
    });
    throw (
      createProfileResult.error ??
      new Error("Identity profile creation returned no data.")
    );
  }

  return createProfileResult.data;
}

export async function getCompanionPreferencesByUserId({
  authenticatedUserId,
  requestedUserId,
  repository,
}: {
  authenticatedUserId: string | null | undefined;
  requestedUserId: string;
  repository: IdentityProfileRepository;
}): Promise<CompanionPreferences> {
  assertIdentityProfileAccess(authenticatedUserId, requestedUserId);

  const profileResult = await repository.getByUserId(requestedUserId);

  if (profileResult.error) {
    logger.warn("Companion preferences lookup failed.", {
      context: "identity",
      source: "identity.preferences",
      error: profileResult.error,
      metadata: { userId: requestedUserId },
    });
    throw profileResult.error;
  }

  if (!profileResult.data) {
    return createDefaultCompanionPreferences();
  }

  return getCompanionPreferencesFromProfilePreferences(profileResult.data.preferences);
}

export async function ensureCompanionPreferencesByUserId({
  authenticatedUserId,
  requestedUserId,
  repository,
}: {
  authenticatedUserId: string | null | undefined;
  requestedUserId: string;
  repository: IdentityProfileRepository;
}): Promise<CompanionPreferences> {
  const profile = await ensureIdentityProfileRecordByUserId({
    authenticatedUserId,
    requestedUserId,
    repository,
  });

  return getCompanionPreferencesFromProfilePreferences(profile.preferences);
}

export async function updateCompanionPreferencesByUserId({
  authenticatedUserId,
  requestedUserId,
  repository,
  input,
}: {
  authenticatedUserId: string | null | undefined;
  requestedUserId: string;
  repository: IdentityProfileRepository;
  input: CompanionPreferencesUpdateInput;
}): Promise<CompanionPreferences> {
  const profile = await ensureIdentityProfileRecordByUserId({
    authenticatedUserId,
    requestedUserId,
    repository,
  });
  const currentPreferences = getCompanionPreferencesFromProfilePreferences(profile.preferences);
  const normalizedInput = normalizeCompanionPreferencesInput(input, currentPreferences);

  if (!normalizedInput.data) {
    throw new InvalidCompanionPreferencesError(normalizedInput.fieldErrors);
  }

  const nextProfilePreferences = setCompanionPreferencesOnProfilePreferences(
    profile.preferences,
    normalizedInput.data,
  );
  const updateResult = await repository.updateByUserId(
    requestedUserId,
    buildEditableValues(profile, nextProfilePreferences),
  );

  if (updateResult.error || !updateResult.data) {
    logger.warn("Companion preferences update failed.", {
      context: "identity",
      source: "identity.preferences",
      error: updateResult.error ?? "Companion preferences update returned no data.",
      metadata: { userId: requestedUserId },
    });
    throw updateResult.error ?? new Error("Companion preferences update returned no data.");
  }

  return getCompanionPreferencesFromProfilePreferences(updateResult.data.preferences);
}

export async function getCompanionPreferencesForUser(
  userId: string,
): Promise<CompanionPreferences> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    return createDefaultCompanionPreferences();
  }

  return getCompanionPreferencesByUserId({
    authenticatedUserId: user.id,
    requestedUserId: userId,
    repository: createIdentityProfileRepository(supabase),
  });
}

export async function ensureCompanionPreferencesForUser(
  userId: string,
): Promise<CompanionPreferences> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    throw new Error("Identity profile access requires an authenticated user.");
  }

  return ensureCompanionPreferencesByUserId({
    authenticatedUserId: user.id,
    requestedUserId: userId,
    repository: createIdentityProfileRepository(supabase),
  });
}

export async function updateCompanionPreferencesForUser(
  userId: string,
  input: CompanionPreferencesUpdateInput,
): Promise<CompanionPreferences> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    throw new Error("Identity profile access requires an authenticated user.");
  }

  return updateCompanionPreferencesByUserId({
    authenticatedUserId: user.id,
    requestedUserId: userId,
    repository: createIdentityProfileRepository(supabase),
    input,
  });
}
