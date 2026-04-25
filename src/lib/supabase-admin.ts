/**
 * Supabase admin client that bypasses RLS.
 * Used for share token operations where the caller is not authenticated.
 * 
 * If SUPABASE_SERVICE_ROLE_KEY is not set, falls back to creating a client
 * without auth headers (relying on RLS policies that allow anonymous access).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (serviceRoleKey) {
    // Service Role key bypasses RLS entirely
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  } else {
    // Fallback: use anon key — relies on RLS policies that allow shared access
    adminClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
  }

  return adminClient;
}
