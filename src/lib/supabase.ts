import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Provide a dummy client for build time / when env vars are not set.
  // API routes will return empty/default data instead of crashing.
  console.warn(
    "Supabase URL or Anon Key is missing. Using dummy client. Database features will not work."
  );
  supabase = createClient(
    "https://placeholder.supabase.co",
    "placeholder-key"
  );
}

export { supabase };
