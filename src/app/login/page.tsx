import { redirect } from "next/navigation";

import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";
import { getAuthenticatedUser } from "@/lib/auth/server";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(AUTHENTICATED_APP_REDIRECT);
  }

  return <LoginForm />;
}
