import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Where the confirmation email link lands.
 *
 * Supabase appends a one-time `code`; trading it for a session is what
 * actually confirms the account and signs the user in.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/plan";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Could not confirm the account.", error);
    return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
