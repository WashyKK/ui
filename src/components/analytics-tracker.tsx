"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reports the current path once per navigation.
 *
 * No cookie and no stored identifier — the server derives a daily-rotating hash
 * from the request itself. Admin routes are excluded: counting your own staff
 * as visitors makes every number wrong.
 */
const IGNORED = ["/admin", "/api", "/auth"];

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (IGNORED.some((prefix) => pathname.startsWith(prefix))) return;
    // React 18+ mounts effects twice in development; without this the same
    // navigation is counted twice.
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const body = JSON.stringify({ path: pathname });

    // sendBeacon survives the page being closed mid-request, which a fetch does
    // not — otherwise the last page of every visit goes uncounted.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  return null;
}

/**
 * Report a search and how many results it returned.
 *
 * Debounced by the caller. Zero-result searches are the whole point: they are a
 * customer naming a part you do not stock, and they are invisible in every
 * other measure because those people simply leave.
 */
export function reportSearch(query: string, resultsCount: number, category?: string | null) {
  if (query.trim().length < 2) return;
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "search", query, resultsCount, category }),
    keepalive: true,
  }).catch(() => {});
}
