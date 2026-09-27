"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Remember whatever date the owner was last looking at in Order of
  // Service, so switching tabs and coming back doesn't silently jump to a
  // guessed "next upcoming" date — it returns to the one being edited.
  useEffect(() => {
    if (currentDate) sessionStorage.setItem(OOS_DATE_KEY, currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [drawerOpen]);

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
    { href: "/maintenance", label: "Maintenance", match: "/maintenance" },
  ];

  return (
    <>
      {/* Desktop: unchanged pill row. Never shown below md. */}
      <nav className="hidden flex-wrap gap-2 md:flex">
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

      {/* Mobile: nine pills don't fit a phone screen — a menu button opening
          a slide-in drawer replaces the pill row. Never shown at md+. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-sm font-semibold text-text-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          Menu
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <nav className="absolute top-0 right-0 bottom-0 flex w-72 max-w-[80%] flex-col bg-surface shadow-xl">
            <div className="flex items-center gap-2 border-b border-border p-4">
              <div className="flex-1 text-sm font-bold tracking-wide text-text-muted uppercase">Menu</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-text-muted"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {TABS.map((tab) => {
                const active = pathname === tab.match || pathname.startsWith(`${tab.match}/`);
                return (
                  <Link
                    key={tab.match}
                    href={tab.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={
                      "block border-b border-border px-4 py-3.5 text-[15px] font-semibold last:border-b-0 " +
                      (active ? "bg-accent-soft text-accent-strong" : "text-foreground")
                    }
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
