import { getAuthCallbackError } from "@/lib/auth/callback-errors";

import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return <SignupForm callbackError={getAuthCallbackError(resolvedSearchParams.error)} />;
}
