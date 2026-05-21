import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { logger } from "@/lib/logger";
import { getSupabaseClientConfig } from "@/lib/supabase/config";

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey, global } = getSupabaseClientConfig();

  return createServerClient(url, anonKey, {
    global,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          logger.warn("Supabase auth cookie sync skipped during SSR.", {
            context: "auth",
            source: "supabase.server",
            error,
          });
        }
      },
    },
  });
}
