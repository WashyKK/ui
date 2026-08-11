import "server-only";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Cookieless visitor counting.
 *
 * The live privacy page states there are no analytics cookies and that no
 * consent banner is therefore needed. That has to stay true, so visitors are
 * identified by a hash of IP + user agent salted with the current date:
 *
 *   - not reversible, so the raw IP is never stored
 *   - rotates at midnight, so the same person is a different hash tomorrow and
 *     the data cannot accumulate into a profile
 *   - good enough to answer "how many people", which is the question asked
 *
 * This is the approach Plausible and Fathom use. It is still processing a
 * personal identifier in memory, which is why the privacy page discloses it.
 */
function dailySalt(): string {
  const today = new Date().toISOString().slice(0, 10);
  // ANALYTICS_SALT keeps the hash unguessable; without it the date alone would
  // let anyone recompute a hash from a suspected IP.
  return `${today}:${process.env.ANALYTICS_SALT ?? "elffie-default-salt"}`;
}

export function visitorHash(req: Request): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";

  return crypto
    .createHash("sha256")
    .update(`${dailySalt()}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

/** Group "E3Z-D61", "e3z d61" and "E3Z_D61" as one search term. */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Referrer host only — never the full URL, which can carry someone's query. */
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

/** Obvious bots. Not exhaustive — the aim is to keep counts honest, not to block. */
const BOT = /bot|crawl|spider|slurp|bing|yandex|duckduck|facebookexternalhit|headless|lighthouse|preview|monitor|curl|wget|python-requests|axios/i;

export function isBot(req: Request): boolean {
  return BOT.test(req.headers.get("user-agent") ?? "");
}

export async function recordPageView(req: Request, path: string): Promise<void> {
  if (isBot(req)) return;
  const { error } = await supabaseServer.from("page_views").insert({
    path: path.slice(0, 300),
    visitor_hash: visitorHash(req),
    referrer_host: referrerHost(req.headers.get("referer")),
  });
  // A missing table means analytics.sql has not been applied. Never let that
  // surface to a visitor.
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    console.error("page view not recorded:", error.message);
  }
}

export async function recordSearch(
  req: Request,
  { query, resultsCount, category }: { query: string; resultsCount: number; category?: string | null }
): Promise<void> {
  if (isBot(req)) return;

  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return;

  const { error } = await supabaseServer.from("search_events").insert({
    query: query.slice(0, 200),
    normalized,
    results_count: Math.max(0, Math.floor(resultsCount)),
    category: category?.slice(0, 120) ?? null,
    visitor_hash: visitorHash(req),
  });
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    console.error("search not recorded:", error.message);
  }
}
