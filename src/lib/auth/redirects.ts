import { env } from "@/lib/env";

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_SUCCESS_REDIRECT = "/";
export const LOGIN_REDIRECT = "/login";
export const SIGNUP_REDIRECT = "/signup";

export type AuthCallbackError = "link_expired" | "verification_failed";

export function getAuthCallbackUrl(): string {
  return new URL(AUTH_CALLBACK_PATH, env.appUrl).toString();
}
