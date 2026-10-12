import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";

const PUBLIC_PATHS = ["/login", "/auth", "/forgot-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Refreshes the session cookie if needed. Do not put code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!signedIn && !isPublic) {
    // A fetch from the app wants an answer it can show, not the login page's HTML.
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Approving the Claude connector must survive a sign-in, authorization id and all.
    if (path === "/oauth/consent") url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (signedIn && path === "/login") {
    const url = request.nextUrl.clone();
    const next = safeNext(request.nextUrl.searchParams.get("next"), request.nextUrl.origin);
    url.pathname = next.split("?")[0];
    url.search = next.includes("?") ? next.slice(next.indexOf("?")) : "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // The Claude connector and its metadata authenticate with bearer tokens, not cookies, so the proxy stays out of them.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/mcp|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
