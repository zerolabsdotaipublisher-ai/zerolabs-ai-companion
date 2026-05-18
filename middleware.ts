import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

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

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon.") ||
    STATIC_FILE_REGEX.test(pathname)
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

function copyCookies(source: NextResponse, target: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";

    const nextPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextPath);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api).*)"],
};
