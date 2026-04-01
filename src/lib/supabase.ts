import { AsyncLocalStorage } from "node:async_hooks";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const accessTokenStorage = new AsyncLocalStorage<string | null>();

function createScopedClient(accessToken: string | null): SupabaseClient {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    });
  }

  // Provide a dummy client for build time / when env vars are not set.
  // API routes will return empty/default data instead of crashing.
  console.warn(
    "Supabase URL or Anon Key is missing. Using dummy client. Database features will not work."
  );
  return createClient("https://placeholder.supabase.co", "placeholder-key");
}

const baseClient = createScopedClient(null);

export function runWithSupabaseAccessToken<T>(
  accessToken: string,
  callback: () => Promise<T>
): Promise<T> {
  return accessTokenStorage.run(accessToken, callback);
}

const tokenUserCache = new Map<string, { user: any; expiresAt: number }>();

export async function verifySupabaseAccessToken(accessToken: string) {
  const now = Date.now();
  const cached = tokenUserCache.get(accessToken);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const { data, error } = await baseClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  // Cache user data for 5 minutes to eliminate network roundtrips on subsequent API calls
  tokenUserCache.set(accessToken, { user: data.user, expiresAt: now + 5 * 60 * 1000 });

  // Rough cleanup of cache to prevent memory leaks in long-running processes
  if (tokenUserCache.size > 200) {
    const firstKey = tokenUserCache.keys().next().value;
    if (firstKey !== undefined) tokenUserCache.delete(firstKey);
  }

  return data.user;
}

// Cache scoped clients to avoid creating new ones on every property access
const scopedClientCache = new Map<string, SupabaseClient>();
const CACHE_KEY_NULL = "__null__";

function getCachedScopedClient(accessToken: string | null): SupabaseClient {
  const key = accessToken ?? CACHE_KEY_NULL;
  let client = scopedClientCache.get(key);
  if (!client) {
    client = createScopedClient(accessToken);
    scopedClientCache.set(key, client);
    // Limit cache size to prevent memory leaks
    if (scopedClientCache.size > 50) {
      const firstKey = scopedClientCache.keys().next().value;
      if (firstKey !== undefined) scopedClientCache.delete(firstKey);
    }
  }
  return client;
}

const supabase: SupabaseClient = new Proxy(baseClient, {
  get(_target, prop) {
    const scopedClient = getCachedScopedClient(accessTokenStorage.getStore() ?? null);
    const value = (scopedClient as unknown as Record<string, unknown>)[
      String(prop)
    ];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(scopedClient);
    }
    return value;
  },
}) as SupabaseClient;

export { supabase };
