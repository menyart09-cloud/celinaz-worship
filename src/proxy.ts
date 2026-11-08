import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/sign-in"];

// The sound booth team never has a next-auth session at all — they sign in
// with their own PIN, a completely separate mechanism (see
// lib/sound-booth/team-session.ts) — so this gate has to leave /team alone
// entirely rather than bouncing them to the admin/leader sign-in page.
// Unlike /sign-in, an admin who's also on the roster should still be able
// to open /team, so this skips both checks below rather than joining
// PUBLIC_PATHS (which would redirect a signed-in admin away from it).
const TEAM_PATHS = ["/team"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isTeamPath = TEAM_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isTeamPath) return;

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
