"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type OnboardingFlowProps = {
  initialName: string;
};

export function OnboardingFlow({ initialName }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [preferredName, setPreferredName] = useState(initialName);
  const [companionVibe, setCompanionVibe] = useState<
    "Spontaneous" | "Reflective" | "Creative" | ""
  >("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = () => {
    if (preferredName.trim() === "") {
      setError("Please enter your preferred name.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleComplete = async () => {
    if (isSubmitting) return;

    if (!companionVibe) {
      setError("Please select a Companion Vibe.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Unable to retrieve user.");
      }

      // Fetch the current profile to safely merge preferences
      const { data: profile, error: profileError } = await supabase
        .from("identity_profiles")
        .select("preferences")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        throw new Error("Unable to load profile preferences.");
      }

      const existingPreferences =
        typeof profile.preferences === "object" &&
        profile.preferences !== null &&
        !Array.isArray(profile.preferences)
          ? profile.preferences
          : {};

      const updatedPreferences = {
        ...existingPreferences,
        onboarding_completed: true,
        companion_vibe: companionVibe,
      };

      const { error: updateError } = await supabase
        .from("identity_profiles")
        .update({
          preferred_name: preferredName.trim(),
          preferences: updatedPreferences,
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error("Failed to update profile.");
      }

      router.refresh();
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <div className="w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome to AI Companion
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            What should we call you?
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder="Your preferred name"
            className="w-full rounded-md border border-zinc-300 px-4 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleNextStep}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-950"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Choose a Vibe
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          How would you like your companion to feel?
        </p>
      </div>

      <div className="flex flex-col space-y-3">
        {(["Spontaneous", "Reflective", "Creative"] as const).map((vibe) => (
          <button
            key={vibe}
            onClick={() => setCompanionVibe(vibe)}
            className={`w-full rounded-md border px-4 py-3 text-left font-medium transition-colors ${
              companionVibe === vibe
                ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {vibe}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleComplete}
        disabled={isSubmitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-950"
      >
        {isSubmitting ? "Completing..." : "Complete"}
      </button>
    </div>
  );
}
