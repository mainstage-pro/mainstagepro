import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Prevent iOS PWA and all browsers from caching any page or API response
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.headers.set("Surrogate-Control", "no-store");

  return res;
}

export const config = {
  matcher: [
    // Match all pages and API routes, skip static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|icons|images|uploads).*)",
  ],
};
