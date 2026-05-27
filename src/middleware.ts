import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/invite", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Preview mode — no Supabase required, always public.
  if (pathname.startsWith("/preview")) {
    return NextResponse.next();
  }

  // No Supabase env? Route everything to the preview equivalent so nothing is broken.
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isPlaceholder =
    !supaUrl ||
    !supaKey ||
    supaUrl.includes("YOUR-PROJECT-REF") ||
    supaUrl.includes("your-project") ||
    supaKey.includes("YOUR-") ||
    supaKey.includes("your-");

  if (isPlaceholder) {
    // Exact-match map first
    const exact: Record<string, string> = {
      "/": "/preview",
      "/login": "/preview/login",
      "/signup": "/preview/signup",
      "/pending": "/preview/pending",
      "/app/home": "/preview/home",
      "/app/chat": "/preview/chat",
      "/app/events": "/preview/events",
      "/app/members": "/preview/members",
      "/app/profile": "/preview/profile",
      "/app/invite": "/preview/invite",
      "/app/notifications": "/preview/notifications",
      "/admin": "/preview/admin",
      "/admin/pending": "/preview/admin-pending",
      "/admin/members": "/preview/admin-members",
      "/admin/events": "/preview/admin-events",
      "/admin/leaderboard": "/preview/admin-leaderboard",
      "/admin/settings": "/preview/admin",
    };
    if (exact[pathname]) {
      return NextResponse.redirect(new URL(exact[pathname], request.url));
    }
    // Prefix matches
    if (pathname.startsWith("/invite/")) {
      return NextResponse.redirect(new URL("/preview/invite-landing", request.url));
    }
    if (pathname.match(/^\/app\/events\/[^/]+\/chat$/)) {
      return NextResponse.redirect(new URL("/preview/event-chat", request.url));
    }
    if (pathname.match(/^\/app\/events\/[^/]+$/)) {
      return NextResponse.redirect(new URL("/preview/event", request.url));
    }
    if (pathname.match(/^\/app\/members\/[^/]+$/)) {
      return NextResponse.redirect(new URL("/preview/member", request.url));
    }
    if (pathname.startsWith("/app")) {
      return NextResponse.redirect(new URL("/preview/home", request.url));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/preview/admin", request.url));
    }
    return NextResponse.next();
  }

  const { response, user, supabase } = await updateSession(request);

  // Public routes — always allow.
  if (isPublic(pathname)) return response;

  // Pending screen — only signed-in users.
  if (pathname === "/pending") {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  // Anything under /app or /admin requires auth + status check.
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const { data: profile } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile || profile.status !== "approved") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    if (
      pathname.startsWith("/admin") &&
      profile.role !== "admin" &&
      profile.role !== "super_admin"
    ) {
      return NextResponse.redirect(new URL("/app/home", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-.*|apple-icon.*|manifest.webmanifest|robots.txt).*)",
  ],
};
