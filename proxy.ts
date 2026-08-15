import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Superadmin restricted paths
  const isSuperadminOnly =
    pathname.startsWith("/dashboard/components") ||
    pathname.startsWith("/dashboard/organizations");

  if (isSuperadminOnly && session.role !== "SUPERADMIN") {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set(
      "error",
      "Access restricted: Superadmin permission required for this section."
    );
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
