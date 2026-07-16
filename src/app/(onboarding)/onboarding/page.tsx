import { redirect } from "next/navigation";

import { requireServerSession } from "@/lib/auth/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const { user } = await requireServerSession({
    pathname: "/onboarding",
  });

  const supabase = await getSupabaseServerClient();

  const { data: profile } = await supabase
    .from("identity_profiles")
    .select("preferred_name, display_name, preferences")
    .eq("user_id", user.id)
    .single();

  const preferences =
    typeof profile?.preferences === "object" && profile.preferences !== null
      ? (profile.preferences as { onboarding_completed?: boolean })
      : {};

  if (preferences.onboarding_completed) {
    redirect("/dashboard");
  }

  const initialName = profile?.preferred_name || profile?.display_name || "";

  return (
    <main className="flex w-full max-w-md flex-col items-center justify-center p-6">
      <OnboardingFlow initialName={initialName} />
    </main>
  );
}
