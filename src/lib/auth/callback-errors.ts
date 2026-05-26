import type { AuthCallbackError } from "./redirects";

export const AUTH_CALLBACK_ERROR_MESSAGES: Record<AuthCallbackError, string> = {
  link_expired:
    "Your email confirmation link has expired. Request a new confirmation email to continue.",
  verification_failed:
    "We couldn't verify your email link. Please request a new confirmation email.",
};

const AUTH_CALLBACK_ERRORS = new Set<AuthCallbackError>([
  "link_expired",
  "verification_failed",
]);

export function isAuthCallbackError(value: string): value is AuthCallbackError {
  return AUTH_CALLBACK_ERRORS.has(value as AuthCallbackError);
}

export function getAuthCallbackError(
  value: string | string[] | undefined,
): AuthCallbackError | undefined {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }

    return getAuthCallbackError(value[0]);
  }

  if (value && isAuthCallbackError(value)) {
    return value;
  }

  return undefined;
}
