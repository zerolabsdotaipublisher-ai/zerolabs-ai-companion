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

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
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

  const { error } = await rollbackAuthUser(userId);

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
  const existingProfileResult = await profileRepository.getByUserId(userId);

  if (existingProfileResult.error) {
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

  const insertResult = await profileRepository.insert(
    buildIdentityProfileUpsertValues(userId, defaults),
  );

  if (insertResult.error && isUniqueConstraintViolation(insertResult.error)) {
    const duplicateProfileResult = await profileRepository.getByUserId(userId);

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
