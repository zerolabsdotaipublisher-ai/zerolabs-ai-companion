"use client";

import { useState, type FormEvent } from "react";

import { getStateChangingAuthHeaders } from "@/lib/auth/origin";
import {
  ACTIVITY_INTENSITY_OPTIONS,
  COMPANION_TONE_OPTIONS,
  LOCATION_PREFERENCE_OPTIONS,
  PREFERRED_TIME_OF_DAY_OPTIONS,
  SUGGESTION_STYLE_OPTIONS,
} from "@/lib/identity/preferences";
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
const PROFILE_SELECT_CLASS_NAME =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-100/20 [color-scheme:light] dark:[color-scheme:dark]";
const PROFILE_SELECT_OPTION_CLASS_NAME = "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100";
const PROFILE_SELECT_OPTION_STYLE = {
  backgroundColor: "rgb(9 9 11)",
  color: "rgb(244 244 245)",
};

function formatOptionLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
          Update the identity details and quiet companion preferences your companion uses.
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

        <div className="space-y-2">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">Companion preferences</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Keep suggestions calm, useful, and tailored to your day.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                field: "companion_tone",
                label: "Companion tone",
                options: COMPANION_TONE_OPTIONS,
              },
              {
                field: "suggestion_style",
                label: "Suggestion style",
                options: SUGGESTION_STYLE_OPTIONS,
              },
              {
                field: "activity_intensity",
                label: "Activity intensity",
                options: ACTIVITY_INTENSITY_OPTIONS,
              },
              {
                field: "preferred_time_of_day",
                label: "Preferred time of day",
                options: PREFERRED_TIME_OF_DAY_OPTIONS,
              },
              {
                field: "location_preference",
                label: "Location preference",
                options: LOCATION_PREFERENCE_OPTIONS,
              },
            ].map(({ field, label, options }) => {
              const fieldError = errors[field as keyof IdentityProfileFormValues];
              const errorId = `profile-${field}-error`;

              return (
                <div className="space-y-1.5" key={field}>
                  <label className="text-sm font-medium" htmlFor={field}>
                    {label}
                  </label>
                  <select
                    aria-describedby={fieldError ? errorId : undefined}
                    aria-invalid={fieldError ? "true" : "false"}
                    className={PROFILE_SELECT_CLASS_NAME}
                    disabled={isSubmitting}
                    id={field}
                    name={field}
                    onChange={(event) => {
                      handleChange(
                        field as keyof IdentityProfileFormValues,
                        event.target.value,
                      );
                    }}
                    value={values[field as keyof IdentityProfileFormValues]}
                  >
                    {options.map((option) => (
                      <option
                        className={PROFILE_SELECT_OPTION_CLASS_NAME}
                        key={option}
                        style={PROFILE_SELECT_OPTION_STYLE}
                        value={option}
                      >
                        {formatOptionLabel(option)}
                      </option>
                    ))}
                  </select>
                  {fieldError ? (
                    <p className="text-sm text-red-600 dark:text-red-400" id={errorId}>
                      {fieldError}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="interests">
                Interests
              </label>
              <input
                aria-describedby={errors.interests ? "profile-interests-error" : "profile-interests-help"}
                aria-invalid={errors.interests ? "true" : "false"}
                className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
                disabled={isSubmitting}
                id="interests"
                name="interests"
                onChange={(event) => {
                  handleChange("interests", event.target.value);
                }}
                placeholder="coffee walks, bookstores, art museums"
                type="text"
                value={values.interests}
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400" id="profile-interests-help">
                Separate items with commas.
              </p>
              {errors.interests ? (
                <p className="text-sm text-red-600 dark:text-red-400" id="profile-interests-error">
                  {errors.interests}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="avoidances">
                Avoidances
              </label>
              <input
                aria-describedby={errors.avoidances ? "profile-avoidances-error" : "profile-avoidances-help"}
                aria-invalid={errors.avoidances ? "true" : "false"}
                className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
                disabled={isSubmitting}
                id="avoidances"
                name="avoidances"
                onChange={(event) => {
                  handleChange("avoidances", event.target.value);
                }}
                placeholder="crowds, loud venues, late nights"
                type="text"
                value={values.avoidances}
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400" id="profile-avoidances-help">
                Separate items with commas.
              </p>
              {errors.avoidances ? (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  id="profile-avoidances-error"
                >
                  {errors.avoidances}
                </p>
              ) : null}
            </div>
          </div>
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
