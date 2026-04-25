"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const PUBLIC_PATHS = new Set(["/login"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublicPath = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/share");

  useEffect(() => {
    if (isPublicPath) {
      return;
    }

    let mounted = true;
    const supabaseBrowser = getSupabaseBrowserClient();

    supabaseBrowser.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        
        if (error) {
          console.error("Auth session error:", error.message);
          // If the refresh token is missing or invalid, clear everything and go to login
          if (error.message.includes("Refresh Token Not Found") || 
              error.message.includes("Invalid Refresh Token")) {
            supabaseBrowser.auth.signOut().finally(() => {
              router.replace("/login");
            });
            return;
          }
        }

        if (!data.session) {
          router.replace("/login");
          return;
        }
        setReady(true);
      })
      .catch((err) => {
        console.error("Unexpected auth error:", err);
        if (mounted) {
          router.replace("/login");
        }
      });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setReady(false);
        router.replace("/login");
        return;
      }
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isPublicPath, router]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        認証情報を確認中...
      </div>
    );
  }

  return <>{children}</>;
}
