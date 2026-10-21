"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client — uses the anon key only. All real security is enforced by
// RLS policies in Supabase. The anon key is safe in client bundles.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.",
    );
  }
  _client = createBrowserClient(url, anon);
  return _client;
}
