import type { AuthCallbackError } from "@/lib/auth/redirects";

import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const AUTH_CALLBACK_ERRORS = new Set<AuthCallbackError>([
  "link_expired",
  "verification_failed",
]);

function isAuthCallbackError(value: string): value is AuthCallbackError {
  return AUTH_CALLBACK_ERRORS.has(value as AuthCallbackError);
}

function getCallbackError(value: string | string[] | undefined): AuthCallbackError | undefined {
  if (Array.isArray(value)) {
    return getCallbackError(value[0]);
  }

  if (value && isAuthCallbackError(value)) {
    return value;
  }

  return undefined;
}

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return <SignupForm callbackError={getCallbackError(resolvedSearchParams.error)} />;
}
