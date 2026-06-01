"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  getClientAuthStatus,
  resolveClientAuthTransition,
  type ClientAuthStatus,
} from "@/lib/auth/client-auth-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthStateListenerProps = {
  isAuthenticated: boolean;
};

export function AuthStateListener({ isAuthenticated }: AuthStateListenerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authStatusRef = useRef<ClientAuthStatus>(getClientAuthStatus(isAuthenticated));
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    authStatusRef.current = getClientAuthStatus(isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    function refreshRoute() {
      if (refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;
      router.refresh();
      queueMicrotask(() => {
        refreshInFlightRef.current = false;
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshRoute();
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const result = resolveClientAuthTransition({
        currentPathname: pathname,
        currentSearch: searchParams.size > 0 ? `?${searchParams.toString()}` : "",
        event,
        hasSession: Boolean(session?.user),
        previousStatus: authStatusRef.current,
      });

      authStatusRef.current = result.nextStatus;

      if (result.redirectTo) {
        router.replace(result.redirectTo);
      }

      if (result.shouldRefresh) {
        refreshRoute();
      }
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshRoute);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshRoute);
    };
  }, [pathname, router, searchParams]);

  return null;
}
