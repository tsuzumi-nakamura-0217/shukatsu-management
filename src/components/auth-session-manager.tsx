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

  document.cookie = `sb-access-token=${accessToken}; Path=/; Max-Age=604800; SameSite=Lax${secureAttr}`;
}

export function AuthSessionManager() {
  useLocalSync();

  useEffect(() => {
    const supabaseBrowser = getSupabaseBrowserClient();
    const originalFetch = window.fetch.bind(window);

    let cachedAccessToken: string | null = null;
    let pendingAccessTokenRequest: Promise<string | null> | null = null;

    const resolveAccessToken = async (forceRefresh = false): Promise<string | null> => {
      if (!forceRefresh && cachedAccessToken) {
        return cachedAccessToken;
      }

      if (!forceRefresh && pendingAccessTokenRequest) {
        return pendingAccessTokenRequest;
      }

      const request = supabaseBrowser.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) {
            console.error("AuthSessionManager session error:", error.message);
            cachedAccessToken = null;
          } else {
            cachedAccessToken = data.session?.access_token ?? null;
          }

          updateTokenCookie(cachedAccessToken);
          return cachedAccessToken;
        })
        .catch((err) => {
          console.error("AuthSessionManager unexpected error:", err);
          cachedAccessToken = null;
          updateTokenCookie(null);
          return null;
        })
        .finally(() => {
          pendingAccessTokenRequest = null;
        });

      pendingAccessTokenRequest = request;
      return request;
    };

    // Initialize token immediately so early API calls can be authenticated.
    void resolveAccessToken();

    // Update cached token on auth state changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      cachedAccessToken = session?.access_token ?? null;
      updateTokenCookie(cachedAccessToken);
    });

    function mergeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);

      if (init?.headers) {
        const initHeaders = new Headers(init.headers);
        initHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      return headers;
    }

    function buildAuthedInit(
      input: RequestInfo | URL,
      init: RequestInit | undefined,
      accessToken: string
    ): RequestInit {
      const headers = mergeHeaders(input, init);
      headers.set("Authorization", `Bearer ${accessToken}`);

      return {
        ...init,
        headers,
      };
    }

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

      const token = cachedAccessToken ?? (await resolveAccessToken());
      if (!token) {
        return originalFetch(input, init);
      }

      const firstResponse = await originalFetch(
        input,
        buildAuthedInit(input, init, token)
      );
      if (firstResponse.status !== 401) {
        return firstResponse;
      }

      const refreshedToken = await resolveAccessToken(true);
      if (!refreshedToken || refreshedToken === token) {
        return firstResponse;
      }

      return originalFetch(input, {
        ...buildAuthedInit(input, init, refreshedToken),
      });
    };

    return () => {
      subscription.unsubscribe();
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
