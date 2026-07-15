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
    .select("preferred_name, display_name")
    .eq("user_id", user.id)
    .single();

  const initialName = profile?.preferred_name || profile?.display_name || "";

  return (
    <main className="flex w-full max-w-md flex-col items-center justify-center p-6">
      <OnboardingFlow initialName={initialName} />
    </main>
  );
}
