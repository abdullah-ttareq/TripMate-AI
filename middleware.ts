import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages that require a signed-in user. */
const PROTECTED = ["/plan", "/result", "/my-trips"];

/**
 * Runs before every matched request. Two jobs:
 *
 * 1. Refresh the auth session, so a signed-in user is not logged out when
 *    their access token expires.
 * 2. Send signed-out visitors to /login instead of a broken page.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. Do not swap this for
  // getSession(), which trusts the cookie without checking it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((prefix) => path.startsWith(prefix));

  if (!user && needsAuth) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    // Remember where they were headed so login can send them back.
    login.searchParams.set("next", path);

    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
