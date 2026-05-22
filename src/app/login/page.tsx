import { redirect } from "next/navigation";

import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";
import { resolvePostAuthRedirectPath } from "@/lib/auth/session-persistence";
import { getAuthenticatedUser } from "@/lib/auth/server";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectTo = resolvePostAuthRedirectPath(
    resolvedSearchParams.next,
    AUTHENTICATED_APP_REDIRECT,
  );
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(redirectTo);
  }

  return <LoginForm redirectTo={redirectTo} />;
}
