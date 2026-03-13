"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
	if (browserClient) return browserClient;

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			"NEXT_PUBLIC_SUPABASE_URL または NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。"
		);
	}

	browserClient = createClient(supabaseUrl, supabaseAnonKey);
	return browserClient;
}
