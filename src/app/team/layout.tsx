import type { Metadata } from "next";

// Overrides the root layout's manifest link for everything under /team —
// its own manifest (start_url "/team") is what makes a Home Screen
// shortcut added from here reopen on /team instead of the admin login.
export const metadata: Metadata = {
  manifest: "/team/team-manifest",
};

// Deliberately outside the (app) route group — no Worship Service nav, no
// admin pills, nothing but what's rendered here. A team member's session
// can only ever reach pages under /team.
export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-md flex-1 px-5 py-8">{children}</div>;
}
