import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ENTRY_REDIRECT } from "@/lib/auth/redirects";
import {
  buildAuthEntryRedirectPath,
  isProtectedAppRoute,
  isStaticAssetPathname,
  normalizeAuthPathname,
} from "@/lib/auth/session-persistence";
import { getSupabaseClientConfig } from "@/lib/supabase/config";
import { logger } from "@/lib/logger";
import { createSupabaseAuthDiagnostics } from "@/lib/supabase/auth-diagnostics";

function copyCookies(source: NextResponse, target: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const normalizedPathname = normalizeAuthPathname(pathname);
  const { url, anonKey, global } = getSupabaseClientConfig();

  if (isStaticAssetPathname(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anonKey, {
    global,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        } catch (error) {
          const reason =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error);

          console.warn("Supabase auth cookie sync skipped in middleware.", {
            source: "middleware",
            reason,
          });
        }
      },
    },
  });

  // getUser() keeps SSR auth authoritative and lets Supabase refresh cookies
  // during middleware execution before protected routes render.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    const diagnostics = await createSupabaseAuthDiagnostics({
      request,
    });

    logger.warn("Supabase middleware session lookup failed.", {
      context: "auth",
      source: "middleware",
      metadata: diagnostics,
      error,
    });
  }

  if (!user && isProtectedAppRoute(normalizedPathname)) {
    const redirectUrl = new URL(
      buildAuthEntryRedirectPath(pathname, request.nextUrl.search, AUTH_ENTRY_REDIRECT),
      request.url,
    );
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)",
  ],
};
