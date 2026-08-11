"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, SearchX, TrendingUp } from "lucide-react";

interface Insights {
  ready: boolean;
  days: number;
  totals?: { views: number; visitors: number; searches: number; zeroResultSearches: number };
  timeline?: { date: string; views: number; visitors: number }[];
  topPages?: { value: string; count: number }[];
  referrers?: { value: string; count: number }[];
  topSearches?: { term: string; searches: number; bestResults: number }[];
  missedSearches?: { term: string; searches: number; bestResults: number }[];
}

const RANGES = [7, 30, 90];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border p-4">
      <p className="label-micro text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

/** Bars, not a chart library — one series over a short window needs no more. */
function Timeline({ data }: { data: { date: string; views: number; visitors: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.views), 1);

  return (
    <section className="border p-4">
      <h3 className="label-micro text-muted-foreground mb-4">Visitors and views</h3>
      <div className="flex items-end gap-1 h-32" role="img" aria-label="Daily visitors and page views">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col justify-end gap-px group relative min-w-0">
            <div
              className="bg-muted"
              style={{ height: `${(d.views / max) * 100}%` }}
              title={`${d.date}: ${d.views} views`}
            />
            <div
              className="bg-foreground"
              style={{ height: `${(d.visitors / max) * 100}%` }}
              title={`${d.date}: ${d.visitors} visitors`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-foreground" /> Visitors
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-muted" /> Views
        </span>
        <span className="ml-auto tabular-nums">
          {data[0]?.date} — {data[data.length - 1]?.date}
        </span>
      </div>
    </section>
  );
}

function RankedList({
  title, hint, rows, empty,
}: {
  title: string;
  hint?: string;
  rows: { label: string; count: number; muted?: string }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <section className="border p-4">
      <h3 className="label-micro text-muted-foreground">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground mt-1 mb-3">{hint}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <ul className="space-y-1.5 mt-3">
          {rows.map((r) => (
            <li key={r.label} className="relative">
              <div
                className="absolute inset-y-0 left-0 bg-muted/70"
                style={{ width: `${(r.count / max) * 100}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-baseline gap-3 px-2 py-1 text-sm">
                <span className="truncate flex-1 min-w-0">{r.label}</span>
                {r.muted && (
                  <span className="text-xs text-muted-foreground shrink-0">{r.muted}</span>
                )}
                <span className="tabular-nums text-xs shrink-0">{r.count}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function InsightsPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/insights?days=${days}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not load insights");
      setData(body);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (data && !data.ready) {
    return (
      <div className="border p-6 space-y-2">
        <h2 className="text-lg font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground">
          Nothing is being recorded yet — <code className="rounded-sm bg-muted px-1">supabase/analytics.sql</code>{" "}
          has not been applied. Run it and traffic starts appearing within minutes.
        </p>
      </div>
    );
  }

  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Insights</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cookieless. Visitors are counted with a daily-rotating hash, so nobody
            is tracked across days and no consent banner is needed.
          </p>
        </div>
        <div className="flex rounded-sm border overflow-hidden text-xs shrink-0">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 transition-colors ${
                days === r ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Visitors" value={t.visitors.toLocaleString()} hint={`over ${days} days`} />
          <Stat label="Page views" value={t.views.toLocaleString()} />
          <Stat label="Searches" value={t.searches.toLocaleString()} />
          <Stat
            label="Found nothing"
            value={t.zeroResultSearches.toLocaleString()}
            hint={t.searches > 0 ? `${Math.round((t.zeroResultSearches / t.searches) * 100)}% of searches` : undefined}
          />
        </div>
      )}

      {data?.timeline && <Timeline data={data.timeline} />}

      <section className="border p-4 border-l-2 border-l-signal">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <SearchX className="h-4 w-4 text-muted-foreground" />
          Searched for, not found
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Each of these is a customer naming a part you do not carry, then leaving.
          It is the only place that demand shows up — they never contact you.
        </p>
        {(data?.missedSearches ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nothing yet. Every search so far returned at least one product.
          </p>
        ) : (
          <ul className="divide-y">
            {data!.missedSearches!.map((s) => (
              <li key={s.term} className="flex items-baseline gap-3 py-2">
                <span className="font-mono text-sm flex-1 min-w-0 truncate">{s.term}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {s.searches} {s.searches === 1 ? "search" : "searches"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <RankedList
          title="Top searches"
          hint="What people type. Result counts tell you whether they found it."
          rows={(data?.topSearches ?? []).map((s) => ({
            label: s.term,
            count: s.searches,
            muted: s.bestResults === 0 ? "no results" : `${s.bestResults} found`,
          }))}
          empty="No searches recorded yet."
        />
        <RankedList
          title="Most viewed pages"
          rows={(data?.topPages ?? []).map((p) => ({ label: p.value, count: p.count }))}
          empty="No page views recorded yet."
        />
      </div>

      <RankedList
        title="Where visitors come from"
        hint="Referring site only — never the full URL, which can carry someone's own search."
        rows={(data?.referrers ?? []).map((r) => ({ label: r.value, count: r.count }))}
        empty="No referrers yet — everyone is arriving directly."
      />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-px" />
        Admin pages are excluded, and obvious bots are filtered out, so these are
        visitors rather than traffic.
      </p>
    </div>
  );
}
