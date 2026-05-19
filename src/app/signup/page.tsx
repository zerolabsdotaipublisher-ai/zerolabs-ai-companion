import type { AuthCallbackError } from "@/lib/auth/redirects";

import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getCallbackError(value: string | string[] | undefined): AuthCallbackError | undefined {
  if (Array.isArray(value)) {
    return getCallbackError(value[0]);
  }

  if (value === "link_expired" || value === "verification_failed") {
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
