import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminRequest } from "@/lib/auth-check";

export const dynamic = "force-dynamic";

/** Missing analytics tables mean the migration has not run — not an error. */
function missing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache/i.test(error.message ?? "")
  );
}

export async function GET(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 30)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [views, searches] = await Promise.all([
    supabaseServer.from("page_views").select("*").gte("created_at", since),
    supabaseServer.from("search_events").select("*").gte("created_at", since),
  ]);

  if (missing(views.error) || missing(searches.error)) {
    return NextResponse.json({ ready: false, days });
  }

  const viewRows = (views.data ?? []) as any[];
  const searchRows = (searches.data ?? []) as any[];

  // Distinct visitors, by the daily-rotating hash. Counted per day and summed,
  // because the hash rotates at midnight — a visitor across two days is two
  // hashes, and pretending otherwise would understate returning traffic.
  const perDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (const v of viewRows) {
    const day = String(v.created_at).slice(0, 10);
    let bucket = perDay.get(day);
    if (!bucket) perDay.set(day, (bucket = { views: 0, visitors: new Set() }));
    bucket.views += 1;
    if (v.visitor_hash) bucket.visitors.add(v.visitor_hash);
  }

  const timeline = Array.from(perDay.entries())
    .map(([date, b]) => ({ date, views: b.views, visitors: b.visitors.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const tally = <T,>(rows: T[], key: (r: T) => string | null) => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = key(r);
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Group searches by normalised term, keeping the best-known result count.
  const terms = new Map<string, { term: string; searches: number; bestResults: number }>();
  for (const s of searchRows) {
    const key = s.normalized;
    let t = terms.get(key);
    if (!t) terms.set(key, (t = { term: s.query, searches: 0, bestResults: 0 }));
    t.searches += 1;
    t.bestResults = Math.max(t.bestResults, Number(s.results_count ?? 0));
  }
  const allTerms = Array.from(terms.values()).sort((a, b) => b.searches - a.searches);

  return NextResponse.json({
    ready: true,
    days,
    totals: {
      views: viewRows.length,
      visitors: new Set(viewRows.map((v) => v.visitor_hash).filter(Boolean)).size,
      searches: searchRows.length,
      // The number worth acting on: people who asked for something and got
      // nothing back.
      zeroResultSearches: searchRows.filter((s) => Number(s.results_count) === 0).length,
    },
    timeline,
    topPages: tally(viewRows, (v: any) => v.path).slice(0, 20),
    referrers: tally(viewRows, (v: any) => v.referrer_host).slice(0, 15),
    topSearches: allTerms.slice(0, 25),
    missedSearches: allTerms.filter((t) => t.bestResults === 0).slice(0, 30),
  });
}
