import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/invite", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, manifest
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-.*|apple-icon.*|manifest.webmanifest|robots.txt).*)",
  ],
};
