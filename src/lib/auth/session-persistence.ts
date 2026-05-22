export type CookieName = {
  name: string;
};

export type RouteSearchParams = Record<string, string | string[] | undefined>;

const STATIC_FILE_REGEX =
  /\.(?:avif|bmp|css|eot|gif|ico|jpeg|jpg|js|json|map|mp4|otf|pdf|png|svg|ttf|txt|webm|webp|woff|woff2|xml)$/i;
const SUPABASE_SESSION_COOKIE_REGEX =
  /^(?:__Host-)?sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i;
const LOCAL_REDIRECT_ORIGIN = "http://localhost";
const AUTH_FLOW_PUBLIC_ROUTES = [
  "/login",
  "/logout",
  "/signup",
  "/auth/callback",
  "/auth/login",
  "/auth/logout",
  "/auth/signup",
] as const;

export const PUBLIC_AUTH_ROUTES = new Set([
  "/",
  "/health",
  "/healthz",
  ...AUTH_FLOW_PUBLIC_ROUTES,
]);

const DISALLOWED_POST_AUTH_REDIRECT_ROUTES = new Set<string>(AUTH_FLOW_PUBLIC_ROUTES);

export function normalizeAuthPathname(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

export function isStaticAssetPathname(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon.") ||
    STATIC_FILE_REGEX.test(pathname)
  );
}

export function isPublicAuthRoute(
  pathname: string,
  publicRoutes: ReadonlySet<string> = PUBLIC_AUTH_ROUTES,
): boolean {
  return publicRoutes.has(normalizeAuthPathname(pathname));
}

export function resolvePostAuthRedirectPath(
  candidatePath: string | string[] | undefined,
  fallbackPath: string,
): string {
  const value = Array.isArray(candidatePath) ? candidatePath[0] : candidatePath;

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallbackPath;
  }

  try {
    const resolvedUrl = new URL(value, LOCAL_REDIRECT_ORIGIN);
    const normalizedPathname = normalizeAuthPathname(resolvedUrl.pathname);

    if (DISALLOWED_POST_AUTH_REDIRECT_ROUTES.has(normalizedPathname)) {
      return fallbackPath;
    }

    return `${resolvedUrl.pathname}${resolvedUrl.search}`;
  } catch {
    return fallbackPath;
  }
}

export function buildAuthEntryRedirectPath(
  pathname: string,
  search: string,
  authEntryPath: string,
): string {
  const redirectUrl = new URL(authEntryPath, "http://localhost");
  redirectUrl.searchParams.set("next", `${pathname}${search}`);
  return `${redirectUrl.pathname}${redirectUrl.search}`;
}

/**
 * Normalizes Next.js page search params into a query string.
 * Undefined values are skipped, while array values emit one entry per item.
 */
export function buildSearchParamsString(searchParams: RouteSearchParams): string {
  const normalizedSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      normalizedSearchParams.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        normalizedSearchParams.append(key, item);
      }
    }
  }

  const search = normalizedSearchParams.toString();
  return search ? `?${search}` : "";
}

export function isSupabaseSessionCookieName(name: string): boolean {
  return SUPABASE_SESSION_COOKIE_REGEX.test(name);
}

export function getSupabaseSessionCookieNames(
  cookies: ReadonlyArray<CookieName>,
): string[] {
  const seenNames = new Set<string>();
  const sessionCookieNames: string[] = [];

  for (const { name } of cookies) {
    if (seenNames.has(name) || !isSupabaseSessionCookieName(name)) {
      continue;
    }

    seenNames.add(name);
    sessionCookieNames.push(name);
  }

  return sessionCookieNames;
}
