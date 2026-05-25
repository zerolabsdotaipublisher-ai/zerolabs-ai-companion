import "server-only";

import { getServerAuthState } from "@/lib/auth/server-session";
import { logger } from "@/lib/logger";

export type IdentityProfileJson =
  | string
  | number
  | boolean
  | null
  | IdentityProfileJson[]
  | { [key: string]: IdentityProfileJson | undefined };

export type IdentityProfileOnboardingStatus = "not_started" | "in_progress" | "completed";

export type IdentityProfileRecord = {
  id: string;
  user_id: string;
  display_name: string | null;
  preferred_name: string | null;
  timezone: string | null;
  locale: string | null;
  onboarding_status: IdentityProfileOnboardingStatus;
  personalization: Record<string, IdentityProfileJson>;
  preferences: Record<string, IdentityProfileJson>;
  memory_settings: Record<string, IdentityProfileJson>;
  created_at: string;
  updated_at: string;
};

export type IdentityProfileDefaults = Partial<
  Pick<
    IdentityProfileRecord,
    "display_name" | "preferred_name" | "timezone" | "locale" | "onboarding_status"
  >
> & {
  personalization?: Record<string, IdentityProfileJson>;
  preferences?: Record<string, IdentityProfileJson>;
  memory_settings?: Record<string, IdentityProfileJson>;
};

export type IdentityProfileUpsertValues = {
  user_id: string;
  display_name: string | null;
  preferred_name: string | null;
  timezone: string | null;
  locale: string | null;
  onboarding_status: IdentityProfileOnboardingStatus;
  personalization: Record<string, IdentityProfileJson>;
  preferences: Record<string, IdentityProfileJson>;
  memory_settings: Record<string, IdentityProfileJson>;
};

const DEFAULT_ONBOARDING_STATUS: IdentityProfileOnboardingStatus = "not_started";

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

export async function getIdentityProfileForUser(userId: string): Promise<IdentityProfileRecord | null> {
  const { user, supabase } = await getServerAuthState();

  if (!user) {
    return null;
  }

  assertIdentityProfileAccess(user.id, userId);

  const { data, error } = await supabase
    .from("identity_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.warn("Identity profile lookup failed.", {
      context: "identity",
      source: "identity.profile",
      error,
      metadata: { userId },
    });
    throw error;
  }

  return data as IdentityProfileRecord | null;
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

  const { data, error } = await supabase
    .from("identity_profiles")
    .upsert(buildIdentityProfileUpsertValues(userId, defaults), {
      onConflict: "user_id",
    })
    .select("*")
    .single();

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
