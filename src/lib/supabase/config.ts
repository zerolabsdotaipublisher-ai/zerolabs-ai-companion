import { env } from "@/lib/env";

const SUPABASE_SERVICE_PATH_REGEX = /^\/(?:auth|functions|realtime|rest|storage)\/v1(?:\/.*)?$/;

function normalizeSupabaseProjectUrl(url: string): string {
  const normalizedUrl = new URL(url);

  if (SUPABASE_SERVICE_PATH_REGEX.test(normalizedUrl.pathname)) {
    normalizedUrl.pathname = "/";
  }

  normalizedUrl.search = "";
  normalizedUrl.hash = "";

  return normalizedUrl.toString().replace(/\/$/, "");
}

export function getSupabaseClientConfig(): {
  anonKey: string;
  url: string;
  global: {
    fetch: typeof fetch;
  };
} {
  return {
    url: normalizeSupabaseProjectUrl(env.supabaseUrl),
    anonKey: env.supabaseAnonKey,
    global: {
      fetch: (...args) => fetch(...args),
    },
  };
}
