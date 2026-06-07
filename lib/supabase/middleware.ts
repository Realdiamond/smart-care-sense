import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Only getUser() here — no DB queries in middleware.
  // Querying user_roles table here causes MIDDLEWARE_INVOCATION_TIMEOUT on Vercel Edge.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes — always allowed through
  const isPublicRoute =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname === "/";

  // Unauthenticated user trying to access a protected route → /auth
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Authenticated user visiting /auth → send into the app.
  // The auth/page.tsx client component handles the correct role-based redirect.
  if (user && pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/patient";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
