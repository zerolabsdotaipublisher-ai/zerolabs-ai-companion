import { LOGIN_REDIRECT } from "@/lib/auth/redirects";

const REDIRECT_URL_BASE = "http://localhost";

function isSafeInternalAppPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\")
  );
}

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
  if (typeof candidatePath !== "string" || !isSafeInternalAppPath(candidatePath)) {
    return fallbackPath;
  }

  try {
    const resolvedUrl = new URL(candidatePath, REDIRECT_URL_BASE);
    const resolvedPath = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;

    if (
      resolvedUrl.origin !== REDIRECT_URL_BASE ||
      !isSafeInternalAppPath(resolvedUrl.pathname) ||
      !isSafeInternalAppPath(resolvedPath)
    ) {
      return fallbackPath;
    }

    return resolvedPath;
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
