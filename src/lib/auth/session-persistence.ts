export type CookieName = {
  name: string;
};

const STATIC_FILE_REGEX =
  /\.(?:avif|bmp|css|eot|gif|ico|jpeg|jpg|js|json|map|mp4|otf|pdf|png|svg|ttf|txt|webm|webp|woff|woff2|xml)$/i;
const SUPABASE_SESSION_COOKIE_REGEX =
  /^(?:__Host-)?sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i;

export const PUBLIC_AUTH_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/login",
  "/auth/logout",
  "/auth/signup",
]);

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

export function buildAuthEntryRedirectPath(
  pathname: string,
  search: string,
  authEntryPath: string,
): string {
  const redirectUrl = new URL(authEntryPath, "http://localhost");
  redirectUrl.searchParams.set("next", `${pathname}${search}`);
  return `${redirectUrl.pathname}${redirectUrl.search}`;
}

export function isSupabaseSessionCookieName(name: string): boolean {
  return SUPABASE_SESSION_COOKIE_REGEX.test(name);
}

export function getSupabaseSessionCookieNames(
  cookies: ReadonlyArray<CookieName>,
): string[] {
  return cookies
    .map((cookie) => cookie.name)
    .filter((name, index, names) => {
      return names.indexOf(name) === index && isSupabaseSessionCookieName(name);
    });
}
