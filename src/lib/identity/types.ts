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

export type IdentityProfileEditableValues = Pick<
  IdentityProfileRecord,
  "display_name" | "preferred_name" | "timezone" | "locale" | "personalization" | "preferences"
>;
