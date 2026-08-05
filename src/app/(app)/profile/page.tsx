import { requireServerSession } from "@/lib/auth/server";
import { toIdentityProfileFormValues } from "@/lib/identity/profile-form";
import { ensureIdentityProfileForUser } from "@/lib/identity/profile";

import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const authState = await requireServerSession({
    pathname: "/profile",
  });

  let profileLoadError: string | null = null;
  let initialValues = null;

  try {
    const profile = await ensureIdentityProfileForUser(authState.user.id);
    initialValues = toIdentityProfileFormValues(profile);
  } catch {
    profileLoadError = "We couldn’t load your profile right now. Please refresh and try again.";
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Profile</h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
          Manage the identity and personalization settings your companion uses.
        </p>
      </div>

      {profileLoadError || !initialValues ? (
        <section className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {profileLoadError ?? "We couldn’t load your profile right now."}
        </section>
      ) : (
        <ProfileForm email={authState.user.email ?? null} initialValues={initialValues} />
      )}
    </main>
  );
}
