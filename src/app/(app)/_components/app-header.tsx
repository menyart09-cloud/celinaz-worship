"use client";

import { useEffect, useRef } from "react";

// List pages stick their own column header just below this bar. Its real
// height shifts as tabs are added/wrap onto a second line, so a hardcoded
// pixel offset drifts stale — this measures it and publishes it as a CSS
// variable every sticky sub-header can read instead of guessing a number.
export function AppHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setHeight = () => {
      document.documentElement.style.setProperty("--app-header-height", `${el.offsetHeight}px`);
    };
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="no-print sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-background pt-4 pb-3"
    >
      {children}
    </div>
  );
}
