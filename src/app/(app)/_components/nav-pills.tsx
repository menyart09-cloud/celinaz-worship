"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/order-of-service", label: "Order of Service" },
  { href: "/log", label: "Service Log" },
  { href: "/add-service", label: "Add Service" },
  { href: "/search", label: "Search" },
  { href: "/songs", label: "Song Library" },
  { href: "/shortlist", label: "Shortlist" },
];

export function NavPills() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors " +
              (active
                ? "border-accent bg-accent text-white"
                : "border-border-strong bg-surface text-text-muted hover:border-accent")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
