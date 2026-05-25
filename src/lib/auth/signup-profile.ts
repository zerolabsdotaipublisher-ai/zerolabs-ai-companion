import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildIdentityProfileUpsertValues,
  type IdentityProfileDefaults,
  type IdentityProfileRecord,
  type IdentityProfileUpsertValues,
} from "@/lib/identity/profile";
import { logger, type LogOptions } from "@/lib/logger";

export type SignupProfileRepository = {
  getByUserId(userId: string): Promise<{
    data: IdentityProfileRecord | null;
    error: unknown | null;
  }>;
  insert(values: IdentityProfileUpsertValues): Promise<{
    data: IdentityProfileRecord | null;
    error: unknown | null;
  }>;
};

export type SignupProfileRollbackHandler = (
  userId: string,
) => Promise<{ error: unknown | null }>;

type SignupProfileWorkflowLogger = Pick<
  typeof logger,
  "error" | "info" | "warn"
>;

type SignupProfileRollbackAttemptParams = {
  rollbackAuthUser: SignupProfileRollbackHandler;
  requestPath?: string;
  source: string;
  userId: string;
  workflowLogger: SignupProfileWorkflowLogger;
};

type SignupProfileRepositoryResult = {
  data: IdentityProfileRecord | null;
  error: unknown | null;
};

type SignupProfileProvisionParams = {
  userId: string;
  defaults?: IdentityProfileDefaults;
  profileRepository: SignupProfileRepository;
  rollbackAuthUser: SignupProfileRollbackHandler;
  requestPath?: string;
  source?: string;
  workflowLogger?: SignupProfileWorkflowLogger;
};

export type SignupProfileProvisionResult = {
  profile: IdentityProfileRecord;
  status: "created" | "existing";
};

export class SignupProfileProvisionError extends Error {
  readonly rollbackAttempted: boolean;
  readonly rollbackSucceeded: boolean;
  readonly userMessage: string;

  constructor(
    userMessage: string,
    options: {
      cause?: unknown;
      rollbackAttempted: boolean;
      rollbackSucceeded: boolean;
    },
  ) {
    super(userMessage, options.cause ? { cause: options.cause } : undefined);
    this.name = "SignupProfileProvisionError";
    this.userMessage = userMessage;
    this.rollbackAttempted = options.rollbackAttempted;
    this.rollbackSucceeded = options.rollbackSucceeded;
  }
}

const SIGNUP_PROFILE_FAILURE_MESSAGE =
  "Unable to create account right now. Please try again.";
const IDENTITY_PROFILES_MIGRATION_FILE =
  "supabase/migrations/20260525014500_create_identity_profiles.sql";
const MISSING_IDENTITY_PROFILES_TABLE_LOG_MESSAGE =
  "Identity profile provisioning depends on the Task 5.1 migration. Apply the identity_profiles migration to the target Supabase database before validating signup.";

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  );
}

function isMissingIdentityProfilesTableError(error: unknown): boolean {
  const message = getErrorMessage(error)?.toLowerCase();

  if (!message) {
    return false;
  }

  return (
    (message.includes("identity_profiles") &&
      message.includes("schema cache")) ||
    (message.includes("public.identity_profiles") &&
      message.includes("could not find the table")) ||
    (message.includes("relation") &&
      message.includes("identity_profiles") &&
      message.includes("does not exist"))
  );
}

function assertIdentityProfileRelationship(
  userId: string,
  profile: IdentityProfileRecord,
): void {
  if (profile.user_id !== userId) {
    throw new Error("Identity profile user relationship mismatch.");
  }
}

function createSignupProfileLogOptions(
  userId: string,
  requestPath: string | undefined,
  source: string,
  error?: unknown,
): LogOptions {
  return {
    context: "auth",
    source,
    ...(error ? { error } : {}),
    metadata: {
      requestPath,
      userId,
    },
  };
}

function createSanitizedRollbackErrorMetadata(
  error: unknown,
): Record<string, number | string> {
  const metadata: Record<string, number | string> = {
    errorType:
      error instanceof Error
        ? error.name
        : typeof error === "object" && error !== null && "name" in error
          ? String(error.name)
          : typeof error,
  };

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (typeof error.code === "number" || typeof error.code === "string")
  ) {
    metadata.code = error.code;
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    metadata.status = error.status;
  }

  return metadata;
}

function logMissingIdentityProfilesTableDiagnostic(
  userId: string,
  requestPath: string | undefined,
  source: string,
  workflowLogger: SignupProfileWorkflowLogger,
  error: unknown,
): void {
  workflowLogger.error(
    MISSING_IDENTITY_PROFILES_TABLE_LOG_MESSAGE,
    {
      context: "auth",
      source,
      error,
      metadata: {
        migrationDependency: "AIC-205 Task 5.1",
        migrationFile: IDENTITY_PROFILES_MIGRATION_FILE,
        requestPath,
        userId,
      },
    },
  );
}

async function attemptAuthUserRollback({
  rollbackAuthUser,
  requestPath,
  source,
  userId,
  workflowLogger,
}: SignupProfileRollbackAttemptParams): Promise<{
  attempted: true;
  succeeded: boolean;
}> {
  workflowLogger.warn(
    "Attempting auth user rollback after identity profile creation failed.",
    createSignupProfileLogOptions(userId, requestPath, source),
  );

  let rollbackResult: { error: unknown | null };

  try {
    rollbackResult = await rollbackAuthUser(userId);
  } catch (error) {
    workflowLogger.error(
      "Auth user rollback failed after identity profile creation error.",
      {
        context: "auth",
        source,
        metadata: {
          requestPath,
          rollbackError: createSanitizedRollbackErrorMetadata(error),
          userId,
        },
      },
    );

    return { attempted: true, succeeded: false };
  }

  const { error } = rollbackResult;

  if (error) {
    workflowLogger.error(
      "Auth user rollback failed after identity profile creation error.",
      createSignupProfileLogOptions(userId, requestPath, source, error),
    );

    return { attempted: true, succeeded: false };
  }

  workflowLogger.info(
    "Rolled back auth user after identity profile creation failed.",
    createSignupProfileLogOptions(userId, requestPath, source),
  );

  return { attempted: true, succeeded: true };
}

async function getSignupProfileByUserId(
  profileRepository: SignupProfileRepository,
  userId: string,
): Promise<SignupProfileRepositoryResult> {
  try {
    return await profileRepository.getByUserId(userId);
  } catch (error) {
    return { data: null, error };
  }
}

async function insertSignupProfile(
  profileRepository: SignupProfileRepository,
  values: IdentityProfileUpsertValues,
): Promise<SignupProfileRepositoryResult> {
  try {
    return await profileRepository.insert(values);
  } catch (error) {
    return { data: null, error };
  }
}

export function createSignupProfileRepository(
  supabaseAdminClient: SupabaseClient,
): SignupProfileRepository {
  return {
    async getByUserId(userId) {
      const { data, error } = await supabaseAdminClient
        .from("identity_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        data: (data as IdentityProfileRecord | null) ?? null,
        error,
      };
    },
    async insert(values) {
      const { data, error } = await supabaseAdminClient
        .from("identity_profiles")
        .insert(values)
        .select("*")
        .single();

      return {
        data: (data as IdentityProfileRecord | null) ?? null,
        error,
      };
    },
  };
}

export function createSignupAuthRollbackHandler(
  supabaseAdminClient: SupabaseClient,
): SignupProfileRollbackHandler {
  return async (userId) => {
    const { error } = await supabaseAdminClient.auth.admin.deleteUser(userId);

    return { error };
  };
}

export async function provisionSignupIdentityProfile({
  userId,
  defaults = {},
  profileRepository,
  rollbackAuthUser,
  requestPath,
  source = "auth.signup",
  workflowLogger = logger,
}: SignupProfileProvisionParams): Promise<SignupProfileProvisionResult> {
  const logOptions = createSignupProfileLogOptions(userId, requestPath, source);
  const existingProfileResult = await getSignupProfileByUserId(
    profileRepository,
    userId,
  );

  if (existingProfileResult.error) {
    if (isMissingIdentityProfilesTableError(existingProfileResult.error)) {
      logMissingIdentityProfilesTableDiagnostic(
        userId,
        requestPath,
        source,
        workflowLogger,
        existingProfileResult.error,
      );
    }

    workflowLogger.error(
      "Identity profile lookup failed after auth signup.",
      createSignupProfileLogOptions(
        userId,
        requestPath,
        source,
        existingProfileResult.error,
      ),
    );

    const rollbackResult = await attemptAuthUserRollback({
      rollbackAuthUser,
      requestPath,
      source,
      userId,
      workflowLogger,
    });

    throw new SignupProfileProvisionError(SIGNUP_PROFILE_FAILURE_MESSAGE, {
      cause: existingProfileResult.error,
      rollbackAttempted: rollbackResult.attempted,
      rollbackSucceeded: rollbackResult.succeeded,
    });
  }

  if (existingProfileResult.data) {
    assertIdentityProfileRelationship(userId, existingProfileResult.data);

    workflowLogger.info(
      "Identity profile already existed after auth signup.",
      logOptions,
    );

    return {
      profile: existingProfileResult.data,
      status: "existing",
    };
  }

  const insertResult = await insertSignupProfile(
    profileRepository,
    buildIdentityProfileUpsertValues(userId, defaults),
  );

  if (insertResult.error && isUniqueConstraintViolation(insertResult.error)) {
    const duplicateProfileResult = await getSignupProfileByUserId(
      profileRepository,
      userId,
    );

    if (!duplicateProfileResult.error && duplicateProfileResult.data) {
      assertIdentityProfileRelationship(userId, duplicateProfileResult.data);

      workflowLogger.info(
        "Identity profile already existed after auth signup.",
        logOptions,
      );

      return {
        profile: duplicateProfileResult.data,
        status: "existing",
      };
    }
  }

  if (insertResult.error || !insertResult.data) {
    const insertError =
      insertResult.error ??
      new Error("Identity profile insert returned no data.");

    if (isMissingIdentityProfilesTableError(insertError)) {
      logMissingIdentityProfilesTableDiagnostic(
        userId,
        requestPath,
        source,
        workflowLogger,
        insertError,
      );
    }

    workflowLogger.error(
      "Identity profile creation failed after auth signup.",
      createSignupProfileLogOptions(userId, requestPath, source, insertError),
    );

    const rollbackResult = await attemptAuthUserRollback({
      rollbackAuthUser,
      requestPath,
      source,
      userId,
      workflowLogger,
    });

    throw new SignupProfileProvisionError(SIGNUP_PROFILE_FAILURE_MESSAGE, {
      cause: insertError,
      rollbackAttempted: rollbackResult.attempted,
      rollbackSucceeded: rollbackResult.succeeded,
    });
  }

  assertIdentityProfileRelationship(userId, insertResult.data);

  return {
    profile: insertResult.data,
    status: "created",
  };
}
