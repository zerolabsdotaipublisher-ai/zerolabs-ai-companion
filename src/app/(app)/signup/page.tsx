import { redirect } from "next/navigation";

import { getAuthCallbackError } from "@/lib/auth/callback-errors";
import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";
import { getAuthenticatedUser } from "@/lib/auth/server";

import { SignupForm } from "./signup-form";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(AUTHENTICATED_APP_REDIRECT);
  }

  return <SignupForm callbackError={getAuthCallbackError(resolvedSearchParams.error)} />;
}
