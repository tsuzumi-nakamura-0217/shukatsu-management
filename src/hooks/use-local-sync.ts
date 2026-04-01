"use client";

import { useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useLocalSync() {
  const lastSyncTime = useRef<number>(0);
  const isSyncing = useRef<boolean>(false);

  const performSync = useCallback(async (reason: string) => {
    // Only sync in development mode
    if (process.env.NODE_ENV !== "development") return;

    // Prevent concurrent syncs
    if (isSyncing.current) return;

    // Throttle: don't sync more than once every 30 seconds
    const now = Date.now();
    if (now - lastSyncTime.current < 30000) {
      console.log(`[Sync] Skipping sync (${reason}): throttled`);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let session = null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn(`[Sync] Failed to get session (${reason}):`, error.message);
        return;
      }
      session = data.session;
    } catch (e) {
      console.warn(`[Sync] Unexpected error during session retrieval (${reason})`);
      return;
    }

    if (!session) {
      // Just log quietly if no session, no need to alert the user
      // console.log(`[Sync] Skipping sync (${reason}): no session`);
      return;
    }

    isSyncing.current = true;
    console.log(`[Sync] Starting sync: ${reason}`);

    try {
      const response = await fetch("/api/local-sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn(`[Sync] Session expired or invalid (401). Skipping background sync.`);
          return;
        }
        throw new Error(`Sync failed with status: ${response.status}`);
      }

      lastSyncTime.current = Date.now();
      toast.info("ローカルデータを同期しました", {
        description: reason === "mount" ? "ログイン中につき最新情報を取得しました" : 
                     reason === "focus" ? "画面がアクティブになったため同期しました" : 
                     "定期的なデータ同期を完了しました",
      });
    } catch (error) {
      // Still log but maybe use warn for less noise in dev console
      console.warn("[Sync] Local sync operation failed:", error);
    } finally {
      isSyncing.current = false;
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // 1. Initial sync on mount
    performSync("mount");

    // 2. Focus sync (fallback)
    const handleFocus = () => {
      performSync("focus");
    };
    window.addEventListener("focus", handleFocus);

    // 3. Realtime subscription
    const supabase = getSupabaseBrowserClient();
    
    // Subscribe to all changes in the public schema
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, and DELETE
          schema: 'public',
        },
        (payload) => {
          console.log('[Sync] Realtime change detected:', payload);
          performSync(`realtime_${payload.eventType}`);
        }
      )
      .subscribe((status) => {
        console.log('[Sync] Realtime subscription status:', status);
      });

    // 4. Auth change sync
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
        performSync("auth_change");
      }
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
      authSubscription.unsubscribe();
    };
  }, [performSync]);
}
