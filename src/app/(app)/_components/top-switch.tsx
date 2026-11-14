"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The one new piece of nav chrome: Worship Service is everything that
// already existed before this feature; Schedule/Manage are the sound booth
// side. Whichever is active decides which pill row NavPills renders below.
export function TopSwitch() {
  const pathname = usePathname();
  // The "View as" preview has its own banner and tabs styled to look like
  // the real /team chrome — stacking the admin switch/pills on top of it
  // would show two confusingly similar navs on one page.
  if (pathname.startsWith("/schedule/manage/preview")) return null;
  const onManage = pathname.startsWith("/schedule/manage");
  const onSchedule = pathname.startsWith("/schedule") && !onManage;

  const tabs = [
    {
      href: "/order-of-service",
      label: "Worship Service",
      active: !pathname.startsWith("/schedule"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
    },
    {
      href: "/schedule",
      label: "Schedule",
      active: onSchedule,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      ),
    },
    {
      href: "/schedule/manage",
      label: "Manage",
      active: onManage,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <div className="inline-flex gap-0.5 rounded-xl border border-border bg-surface-sunk p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold [&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:flex-none " +
            (tab.active ? "bg-surface text-accent-strong shadow-sm" : "text-text-muted")
          }
        >
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
