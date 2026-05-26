import { redirect } from "next/navigation";

import { getAuthCallbackError } from "@/lib/auth/callback-errors";
import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";
import { resolvePostAuthRedirectPath } from "@/lib/auth/session-persistence";
import { getAuthenticatedUser } from "@/lib/auth/server";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const awaitedSearchParams = (await searchParams) ?? {};
  const redirectTo = resolvePostAuthRedirectPath(
    awaitedSearchParams.next,
    AUTHENTICATED_APP_REDIRECT,
  );
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <LoginForm
      callbackError={getAuthCallbackError(awaitedSearchParams.error)}
      redirectTo={redirectTo}
    />
  );
}
