import { LOGIN_REDIRECT } from "@/lib/auth/redirects";

const REDIRECT_URL_BASE = "http://localhost";

function getLogoutRedirectCandidate(responseBody: unknown): unknown {
  if (!responseBody || typeof responseBody !== "object") {
    return undefined;
  }

  return "redirectTo" in responseBody
    ? (responseBody as { redirectTo?: unknown }).redirectTo
    : undefined;
}

export function resolveLogoutRedirectPath(
  candidatePath: unknown,
  fallbackPath: string = LOGIN_REDIRECT,
): string {
  if (
    typeof candidatePath !== "string" ||
    candidatePath.length === 0 ||
    !candidatePath.startsWith("/") ||
    candidatePath.startsWith("//")
  ) {
    return fallbackPath;
  }

  try {
    const resolvedUrl = new URL(candidatePath, REDIRECT_URL_BASE);
    return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
  } catch {
    return fallbackPath;
  }
}

export function resolveLogoutRedirectPathFromResponseBody(
  responseBody: unknown,
  fallbackPath: string = LOGIN_REDIRECT,
): string {
  return resolveLogoutRedirectPath(
    getLogoutRedirectCandidate(responseBody),
    fallbackPath,
  );
}
