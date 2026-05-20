import { redirect } from "next/navigation";

import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(AUTHENTICATED_APP_REDIRECT);
  }

  return <LoginForm />;
}
