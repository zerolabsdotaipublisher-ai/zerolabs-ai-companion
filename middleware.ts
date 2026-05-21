import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ENTRY_REDIRECT } from "@/lib/auth/redirects";
import { getSupabaseClientConfig } from "@/lib/supabase/config";
import { logger } from "@/lib/logger";
import { createSupabaseAuthDiagnostics } from "@/lib/supabase/auth-diagnostics";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/login",
  "/auth/signup",
]);

const STATIC_FILE_REGEX =
  /\.(?:avif|bmp|css|eot|gif|ico|jpeg|jpg|js|json|map|mp4|otf|pdf|png|svg|ttf|txt|webm|webp|woff|woff2|xml)$/i;

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon.") ||
    STATIC_FILE_REGEX.test(pathname)
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(normalizePathname(pathname));
}

function copyCookies(source: NextResponse, target: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const normalizedPathname = normalizePathname(pathname);
  const { url, anonKey, global } = getSupabaseClientConfig();

  if (isStaticAsset(pathname)) {
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

  if (!user && !isPublicRoute(normalizedPathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ENTRY_REDIRECT;

    const nextPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextPath);

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
