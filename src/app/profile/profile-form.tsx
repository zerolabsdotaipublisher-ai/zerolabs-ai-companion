"use client";

import { useState, type FormEvent } from "react";

import { getStateChangingAuthHeaders } from "@/lib/auth/origin";
import {
  buildIdentityProfileUpdateValues,
  type IdentityProfileFormErrors,
  type IdentityProfileFormValues,
} from "@/lib/identity/profile-form";

type ProfileFormProps = {
  email: string | null;
  initialValues: IdentityProfileFormValues;
};

type ProfileResponse = {
  error?: string;
  fieldErrors?: IdentityProfileFormErrors;
  message?: string;
  profile?: IdentityProfileFormValues;
};

const SAVE_BUTTON_LABEL = "Save profile";
const SAVE_BUTTON_PENDING_LABEL = "Saving...";
const SAVE_ERROR_MESSAGE =
  "We couldn’t save your profile right now. Please try again in a moment.";

function hasChanges(
  currentValues: IdentityProfileFormValues,
  savedValues: IdentityProfileFormValues,
): boolean {
  return (Object.keys(currentValues) as Array<keyof IdentityProfileFormValues>).some(
    (key) => currentValues[key] !== savedValues[key],
  );
}

export function ProfileForm({ email, initialValues }: ProfileFormProps) {
  const [values, setValues] = useState<IdentityProfileFormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<IdentityProfileFormValues>(initialValues);
  const [errors, setErrors] = useState<IdentityProfileFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSaveDisabled = isSubmitting || !hasChanges(values, savedValues);

  function handleChange(field: keyof IdentityProfileFormValues, nextValue: string) {
    setValues((previousValues) => ({
      ...previousValues,
      [field]: nextValue,
    }));
    setSubmitError(null);
    setSuccessMessage(null);
    setErrors((previousErrors) => {
      if (!previousErrors[field]) {
        return previousErrors;
      }

      return {
        ...previousErrors,
        [field]: undefined,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);
    setSuccessMessage(null);

    const validationResult = buildIdentityProfileUpdateValues(values);
    setErrors(validationResult.fieldErrors);

    if (!validationResult.data) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getStateChangingAuthHeaders(),
        },
        body: JSON.stringify(values),
      });

      let result: ProfileResponse = {};

      try {
        result = (await response.json()) as ProfileResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        setErrors(result.fieldErrors ?? {});
        setSubmitError(result.error ?? SAVE_ERROR_MESSAGE);
        return;
      }

      const nextValues = result.profile ?? values;
      setValues(nextValues);
      setSavedValues(nextValues);
      setErrors({});
      setSuccessMessage(result.message ?? "Profile saved.");
    } catch {
      setSubmitError(SAVE_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Profile settings</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Update the identity details and personalization settings your companion uses.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as <span className="font-medium">{email ?? "your account"}</span>.
        </p>
      </div>

      <form aria-busy={isSubmitting} className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
        <p aria-live="polite" className="sr-only" role="status">
          {isSubmitting ? "Saving your profile. Please wait." : ""}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="display_name">
              Display name
            </label>
            <input
              aria-describedby={errors.display_name ? "profile-display-name-error" : undefined}
              aria-invalid={errors.display_name ? "true" : "false"}
              autoComplete="name"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              disabled={isSubmitting}
              id="display_name"
              name="display_name"
              onChange={(event) => {
                handleChange("display_name", event.target.value);
              }}
              placeholder="How your companion should address you"
              type="text"
              value={values.display_name}
            />
            {errors.display_name ? (
              <p className="text-sm text-red-600 dark:text-red-400" id="profile-display-name-error">
                {errors.display_name}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="preferred_name">
              Preferred name
            </label>
            <input
              aria-describedby={errors.preferred_name ? "profile-preferred-name-error" : undefined}
              aria-invalid={errors.preferred_name ? "true" : "false"}
              autoComplete="nickname"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              disabled={isSubmitting}
              id="preferred_name"
              name="preferred_name"
              onChange={(event) => {
                handleChange("preferred_name", event.target.value);
              }}
              placeholder="A shorter name, if you use one"
              type="text"
              value={values.preferred_name}
            />
            {errors.preferred_name ? (
              <p
                className="text-sm text-red-600 dark:text-red-400"
                id="profile-preferred-name-error"
              >
                {errors.preferred_name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="timezone">
              Timezone
            </label>
            <input
              aria-describedby={errors.timezone ? "profile-timezone-error" : undefined}
              aria-invalid={errors.timezone ? "true" : "false"}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              disabled={isSubmitting}
              id="timezone"
              name="timezone"
              onChange={(event) => {
                handleChange("timezone", event.target.value);
              }}
              placeholder="America/Los_Angeles"
              type="text"
              value={values.timezone}
            />
            {errors.timezone ? (
              <p className="text-sm text-red-600 dark:text-red-400" id="profile-timezone-error">
                {errors.timezone}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="locale">
              Locale
            </label>
            <input
              aria-describedby={errors.locale ? "profile-locale-error" : undefined}
              aria-invalid={errors.locale ? "true" : "false"}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              disabled={isSubmitting}
              id="locale"
              name="locale"
              onChange={(event) => {
                handleChange("locale", event.target.value);
              }}
              placeholder="en-US"
              type="text"
              value={values.locale}
            />
            {errors.locale ? (
              <p className="text-sm text-red-600 dark:text-red-400" id="profile-locale-error">
                {errors.locale}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="personalization">
            Personalization JSON
          </label>
          <textarea
            aria-describedby={errors.personalization ? "profile-personalization-error" : "profile-personalization-help"}
            aria-invalid={errors.personalization ? "true" : "false"}
            className="min-h-36 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
            disabled={isSubmitting}
            id="personalization"
            name="personalization"
            onChange={(event) => {
              handleChange("personalization", event.target.value);
            }}
            placeholder='{"communication_style":"concise"}'
            value={values.personalization}
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400" id="profile-personalization-help">
            Leave blank to keep an empty object.
          </p>
          {errors.personalization ? (
            <p
              className="text-sm text-red-600 dark:text-red-400"
              id="profile-personalization-error"
            >
              {errors.personalization}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="preferences">
            Preferences JSON
          </label>
          <textarea
            aria-describedby={errors.preferences ? "profile-preferences-error" : "profile-preferences-help"}
            aria-invalid={errors.preferences ? "true" : "false"}
            className="min-h-36 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
            disabled={isSubmitting}
            id="preferences"
            name="preferences"
            onChange={(event) => {
              handleChange("preferences", event.target.value);
            }}
            placeholder='{"daily_summary":true}'
            value={values.preferences}
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400" id="profile-preferences-help">
            Use a JSON object for lightweight preference flags.
          </p>
          {errors.preferences ? (
            <p className="text-sm text-red-600 dark:text-red-400" id="profile-preferences-error">
              {errors.preferences}
            </p>
          ) : null}
        </div>

        {submitError ? (
          <p
            aria-live="assertive"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        {successMessage ? (
          <p
            aria-live="polite"
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}

        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 sm:w-auto"
          disabled={isSaveDisabled}
          type="submit"
        >
          {isSubmitting ? SAVE_BUTTON_PENDING_LABEL : SAVE_BUTTON_LABEL}
        </button>
      </form>
    </section>
  );
}
