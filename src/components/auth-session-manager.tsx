"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

import { useLocalSync } from "@/hooks/use-local-sync";

function updateTokenCookie(accessToken: string | null) {
  if (typeof document === "undefined") return;

  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  if (!accessToken) {
    document.cookie = `sb-access-token=; Path=/; Max-Age=0; SameSite=Lax${secureAttr}`;
    return;
  }

  document.cookie = `sb-access-token=${encodeURIComponent(accessToken)}; Path=/; Max-Age=604800; SameSite=Lax${secureAttr}`;
}

export function AuthSessionManager() {
  useLocalSync();

  useEffect(() => {
    const supabaseBrowser = getSupabaseBrowserClient();
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const isSameOriginApi =
        requestUrl.startsWith("/api") ||
        requestUrl.startsWith(`${window.location.origin}/api`);

      if (!isSameOriginApi) {
        return originalFetch(input, init);
      }

      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init?.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    supabaseBrowser.auth.getSession().then(({ data }) => {
      updateTokenCookie(data.session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      updateTokenCookie(session?.access_token ?? null);
    });

    return () => {
      subscription.unsubscribe();
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
