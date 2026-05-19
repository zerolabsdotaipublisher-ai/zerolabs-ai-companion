"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const MIN_PASSWORD_LENGTH = 8;
const emailSchema = z.string().email();

function isValidEmailFormat(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const normalizedEmail = values.email.trim();

  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!isValidEmailFormat(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function SignupPage() {
  const [values, setValues] = useState<FormValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);
    setSuccessMessage(null);

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const { error } = await getSupabaseBrowserClient().auth.signUp({
      email: values.email.trim(),
      password: values.password,
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message || "Signup failed. Please try again.");
      return;
    }

    setSuccessMessage(
      "Account created. Check your email for a confirmation link, then log in.",
    );
    setValues({ email: "", password: "", confirmPassword: "" });
    setErrors({});
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Sign up for AI Companion to get started.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              id="email"
              inputMode="email"
              name="email"
              onChange={(event) =>
                setValues((previous) => ({ ...previous, email: event.target.value }))
              }
              placeholder="you@example.com"
              type="email"
              value={values.email}
            />
            {errors.email ? (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              id="password"
              name="password"
              onChange={(event) =>
                setValues((previous) => ({ ...previous, password: event.target.value }))
              }
              placeholder="At least 8 characters"
              type="password"
              value={values.password}
            />
            {errors.password ? (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              id="confirmPassword"
              name="confirmPassword"
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="Re-enter your password"
              type="password"
              value={values.confirmPassword}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {submitError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {successMessage}
            </p>
          ) : null}

          <button
            className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-300">
          Already have an account?{" "}
          <Link className="font-medium text-zinc-900 underline dark:text-zinc-100" href="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
