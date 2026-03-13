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

export async function verifySupabaseAccessToken(accessToken: string) {
  const { data, error } = await baseClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

const supabase: SupabaseClient = new Proxy(baseClient, {
  get(_target, prop) {
    const scopedClient = createScopedClient(accessTokenStorage.getStore() ?? null);
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
