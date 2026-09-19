"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const OOS_DATE_KEY = "oos-last-date";

function noopSubscribe() {
  return () => {};
}

function getStoredDate() {
  return sessionStorage.getItem(OOS_DATE_KEY);
}

function getServerDate() {
  return null;
}

export function NavPills() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = pathname === "/order-of-service" ? searchParams.get("date") : null;

  // Remember whatever date the owner was last looking at in Order of
  // Service, so switching tabs and coming back doesn't silently jump to a
  // guessed "next upcoming" date — it returns to the one being edited.
  useEffect(() => {
    if (currentDate) sessionStorage.setItem(OOS_DATE_KEY, currentDate);
  }, [currentDate]);

  const lastKnownDate = useSyncExternalStore(noopSubscribe, getStoredDate, getServerDate);
  const oosDate = currentDate ?? lastKnownDate;
  const oosHref = oosDate ? `/order-of-service?date=${oosDate}` : "/order-of-service";

  const TABS = [
    { href: oosHref, label: "Order of Service", match: "/order-of-service" },
    { href: "/log", label: "Service Log", match: "/log" },
    { href: "/add-service", label: "Add Service", match: "/add-service" },
    { href: "/search", label: "Search", match: "/search" },
    { href: "/songs", label: "Song Library", match: "/songs" },
    { href: "/shortlist", label: "Shortlist", match: "/shortlist" },
    { href: "/choruses", label: "Choruses", match: "/choruses" },
    { href: "/scriptures", label: "Scriptures", match: "/scriptures" },
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.match || pathname.startsWith(`${tab.match}/`);
        return (
          <Link
            key={tab.match}
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
