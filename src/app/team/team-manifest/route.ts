import { NextResponse } from "next/server";

// iOS launches a Home Screen shortcut at the manifest's start_url, not at
// whatever page you tapped "Add to Home Screen" from — the site-wide
// manifest.ts (start_url "/") is what was sending team members' shortcuts
// to the admin login. This is /team's own manifest, scoped so their
// shortcut always reopens on /team instead.
export function GET() {
  return NextResponse.json(
    {
      name: "Celinaz Worship Team",
      short_name: "Team",
      description: "Sign in to see your schedule",
      start_url: "/team",
      scope: "/team",
      display: "standalone",
      background_color: "#faf9f6",
      theme_color: "#0a3b64",
      icons: [
        { src: "/logo-192.png", sizes: "192x192", type: "image/png" },
        { src: "/logo-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
