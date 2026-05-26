import { env } from "@/lib/env";

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTHENTICATED_APP_REDIRECT = "/dashboard";
export const AUTH_SUCCESS_REDIRECT = AUTHENTICATED_APP_REDIRECT;
export const LOGIN_REDIRECT = "/login";
export const SIGNUP_REDIRECT = "/signup";
export const AUTH_ENTRY_REDIRECT = LOGIN_REDIRECT;

export type AuthCallbackError = "link_expired" | "verification_failed";

function getOrigin(value: string | URL): string | undefined {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function getAuthCallbackUrl(requestUrl?: string | URL): string {
  const origin = getOrigin(requestUrl ?? env.appUrl) ?? env.appUrl;
  return new URL(AUTH_CALLBACK_PATH, origin).toString();
}
