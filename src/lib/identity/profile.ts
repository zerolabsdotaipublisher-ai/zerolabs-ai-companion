import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerAuthState } from "@/lib/auth/server-session";
import { logger } from "@/lib/logger";
import type {
  IdentityProfileDefaults,
  IdentityProfileEditableValues,
  IdentityProfileOnboardingStatus,
  IdentityProfileRecord,
  IdentityProfileUpsertValues,
} from "@/lib/identity/types";

export type {
  IdentityProfileDefaults,
  IdentityProfileEditableValues,
  IdentityProfileJson,
  IdentityProfileOnboardingStatus,
  IdentityProfileRecord,
  IdentityProfileUpsertValues,
} from "@/lib/identity/types";

const DEFAULT_ONBOARDING_STATUS: IdentityProfileOnboardingStatus = "not_started";
export const IDENTITY_PROFILE_NOT_FOUND_ERROR_MESSAGE = "Identity profile was not found.";

type IdentityProfileMutationResult = {
  data: IdentityProfileRecord | null;
  error: unknown;
};

export type IdentityProfileRepository = {
  getByUserId(userId: string): Promise<IdentityProfileMutationResult>;
  updateByUserId(
    userId: string,
    values: IdentityProfileEditableValues,
  ): Promise<IdentityProfileMutationResult>;
  upsert(values: IdentityProfileUpsertValues): Promise<IdentityProfileMutationResult>;
};

export function createIdentityProfileRepository(
  supabase: SupabaseClient,
): IdentityProfileRepository {
  return {
    async getByUserId(userId) {
      const { data, error } = await supabase
        .from("identity_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        data: data as IdentityProfileRecord | null,
        error,
      };
    },
    async updateByUserId(userId, values) {
      const { data, error } = await supabase
        .from("identity_profiles")
        .update(values)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();

      return {
        data: data as IdentityProfileRecord | null,
        error,
      };
    },
    async upsert(values) {
      const { data, error } = await supabase
        .from("identity_profiles")
        .upsert(values, {
          onConflict: "user_id",
        })
        .select("*")
        .single();

      return {
        data: data as IdentityProfileRecord | null,
        error,
      };
    },
  };
}

export function isIdentityProfileAccessAllowed(
  authenticatedUserId: string | null | undefined,
  requestedUserId: string,
): boolean {
  return authenticatedUserId === requestedUserId;
}

export function buildIdentityProfileUpsertValues(
  userId: string,
  defaults: IdentityProfileDefaults = {},
): IdentityProfileUpsertValues {
  return {
    user_id: userId,
    display_name: defaults.display_name ?? null,
    preferred_name: defaults.preferred_name ?? null,
    timezone: defaults.timezone ?? null,
    locale: defaults.locale ?? null,
    onboarding_status: defaults.onboarding_status ?? DEFAULT_ONBOARDING_STATUS,
    personalization: defaults.personalization ?? {},
    preferences: defaults.preferences ?? {},
    memory_settings: defaults.memory_settings ?? {},
  };
}

function assertIdentityProfileAccess(
  authenticatedUserId: string | null | undefined,
  requestedUserId: string,
): void {
  if (!isIdentityProfileAccessAllowed(authenticatedUserId, requestedUserId)) {
    throw new Error("Identity profile access is limited to the authenticated user.");
  }
}

export async function getIdentityProfileByUserId({
  authenticatedUserId,
  requestedUserId,
  repository,
}: {
  authenticatedUserId: string | null | undefined;
  requestedUserId: string;
  repository: IdentityProfileRepository;
}): Promise<IdentityProfileRecord | null> {
  assertIdentityProfileAccess(authenticatedUserId, requestedUserId);

  const { data, error } = await repository.getByUserId(requestedUserId);

  if (error) {
    logger.warn("Identity profile lookup failed.", {
      context: "identity",
      source: "identity.profile",
      error,
      metadata: { userId: requestedUserId },
    });
    throw error;
  }

  return data;
}

export async function getIdentityProfileForUser(
  userId: string,
): Promise<IdentityProfileRecord | null> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    return null;
  }

  return getIdentityProfileByUserId({
    authenticatedUserId: user.id,
    requestedUserId: userId,
    repository: createIdentityProfileRepository(supabase),
  });
}

export async function updateIdentityProfileByUserId({
  authenticatedUserId,
  requestedUserId,
  repository,
  values,
}: {
  authenticatedUserId: string | null | undefined;
  requestedUserId: string;
  repository: IdentityProfileRepository;
  values: IdentityProfileEditableValues;
}): Promise<IdentityProfileRecord> {
  assertIdentityProfileAccess(authenticatedUserId, requestedUserId);

  const { data, error } = await repository.updateByUserId(requestedUserId, values);

  if (error || !data) {
    logger.warn("Identity profile update failed.", {
      context: "identity",
      source: "identity.profile",
      error: error ?? IDENTITY_PROFILE_NOT_FOUND_ERROR_MESSAGE,
      metadata: { userId: requestedUserId },
    });

    throw error ?? new Error(IDENTITY_PROFILE_NOT_FOUND_ERROR_MESSAGE);
  }

  return data;
}

export async function updateIdentityProfileForUser(
  userId: string,
  values: IdentityProfileEditableValues,
): Promise<IdentityProfileRecord> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    throw new Error("Identity profile access requires an authenticated user.");
  }

  assertIdentityProfileAccess(user.id, userId);

  return updateIdentityProfileByUserId({
    authenticatedUserId: user.id,
    requestedUserId: userId,
    repository: createIdentityProfileRepository(supabase),
    values,
  });
}

export async function ensureIdentityProfileForUser(
  userId: string,
  defaults: IdentityProfileDefaults = {},
): Promise<IdentityProfileRecord> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    throw new Error("Identity profile access requires an authenticated user.");
  }

  assertIdentityProfileAccess(user.id, userId);

  const { data, error } = await createIdentityProfileRepository(supabase).upsert(
    buildIdentityProfileUpsertValues(userId, defaults),
  );

  if (error || !data) {
    logger.warn("Identity profile upsert failed.", {
      context: "identity",
      source: "identity.profile",
      error: error ?? "Supabase identity profile upsert returned no data.",
      metadata: { userId },
    });
    throw error ?? new Error("Supabase identity profile upsert returned no data.");
  }

  return data as IdentityProfileRecord;
}
