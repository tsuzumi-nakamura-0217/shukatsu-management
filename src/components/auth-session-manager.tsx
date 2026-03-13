"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
  useEffect(() => {
    const supabaseBrowser = getSupabaseBrowserClient();

    supabaseBrowser.auth.getSession().then(({ data }) => {
      updateTokenCookie(data.session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      updateTokenCookie(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
