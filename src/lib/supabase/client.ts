"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClientConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, anonKey, global } = getSupabaseClientConfig();
    browserClient = createBrowserClient(url, anonKey, { global });
  }

  return browserClient;
}
