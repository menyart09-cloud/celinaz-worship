// Deliberately outside the (app) route group — no Worship Service nav, no
// admin pills, nothing but what's rendered here. A team member's session
// can only ever reach pages under /team.
export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-md flex-1 px-5 py-8">{children}</div>;
}
