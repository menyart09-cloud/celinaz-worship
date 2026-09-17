import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/sign-in"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!req.auth && !isPublicPath) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (req.auth && isPublicPath) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  // Public static files (icons, manifest) must stay reachable without a
  // session — iOS fetches the home-screen icon and manifest anonymously,
  // and a redirect to /sign-in there just breaks the icon silently.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webmanifest)$).*)",
  ],
};
