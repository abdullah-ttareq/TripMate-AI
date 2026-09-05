import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser code (sign-up, sign-in forms).
 *
 * The anon key is meant to be public — it identifies the project, it does not
 * grant access. What actually protects the data is Row Level Security, which
 * scopes every query to the signed-in user (see supabase/schema.sql).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
