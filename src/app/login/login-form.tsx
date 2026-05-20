"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  type LoginFormErrors,
  type LoginFormValues,
  validateLoginValues,
} from "@/lib/auth/login";
import { AUTHENTICATED_APP_REDIRECT } from "@/lib/auth/redirects";

type LoginResponse = {
  error?: string;
  fieldErrors?: LoginFormErrors;
  redirectTo?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);

    const nextErrors = validateLoginValues(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setErrors(result.fieldErrors ?? {});
        setSubmitError(
          result.error ||
            "Unable to log in. Please check your information and try again.",
        );
        return;
      }

      setErrors({});
      router.replace(result.redirectTo ?? AUTHENTICATED_APP_REDIRECT);
      router.refresh();
    } catch {
      setSubmitError("Unable to log in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Log in to AI Companion with your email and password.
        </p>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              disabled={isSubmitting}
              id="email"
              inputMode="email"
              name="email"
              onChange={(event) => {
                setValues((previous) => ({ ...previous, email: event.target.value }));
              }}
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
              autoComplete="current-password"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:ring-zinc-100/20"
              disabled={isSubmitting}
              id="password"
              name="password"
              onChange={(event) => {
                setValues((previous) => ({ ...previous, password: event.target.value }));
              }}
              placeholder="Enter your password"
              type="password"
              value={values.password}
            />
            {errors.password ? (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>
            ) : null}
          </div>

          {submitError ? (
            <p
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          <button
            className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-300">
          Need an account?{" "}
          <Link className="font-medium text-zinc-900 underline dark:text-zinc-100" href="/signup">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
