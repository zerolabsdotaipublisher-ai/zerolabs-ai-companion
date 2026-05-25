import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { serverConfig } from "@/config/env";
import { getSupabaseClientConfig } from "@/lib/supabase/config";

let supabaseAdminClient: SupabaseClient | undefined;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const { url, global } = getSupabaseClientConfig();

    supabaseAdminClient = createClient(
      url,
      serverConfig.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global,
      },
    );
  }

  return supabaseAdminClient;
}
