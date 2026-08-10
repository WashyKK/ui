"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { Facet } from "@/lib/attributes";

/**
 * Facets over spec values, with the selection in the URL.
 *
 * Buyers arrive knowing 24 V, IP65, NEMA 17 — not a price band, which is what a
 * consumer storefront would filter on. Keeping the state in the query string
 * means a filtered catalogue is a link someone can send a colleague, which is
 * how procurement actually works here.
 */
export default function SpecFilters({ facets }: { facets: Facet[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedFor = useCallback(
    (key: string) => new Set(searchParams.getAll(key)),
    [searchParams]
  );

  const activeCount = facets.reduce((sum, f) => sum + selectedFor(f.key).size, 0);

  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const current = next.getAll(key);
    next.delete(key);
    const remaining = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    remaining.forEach((v) => next.append(key, v));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    const next = new URLSearchParams(searchParams.toString());
    facets.forEach((f) => next.delete(f.key));
    router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  if (facets.length === 0) return null;

  return (
    <aside className="space-y-6" aria-label="Filter by specification">
      <div className="flex items-center justify-between">
        <h2 className="label-micro text-muted-foreground">Specification</h2>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear {activeCount}
          </button>
        )}
      </div>

      {facets.map((facet) => {
        const selected = selectedFor(facet.key);
        return (
          <fieldset key={facet.key} className="space-y-2">
            <legend className="text-xs font-medium mb-1.5">
              {facet.label}
              {facet.unit && <span className="text-muted-foreground"> ({facet.unit})</span>}
            </legend>
            <div className="space-y-1.5">
              {facet.values.map(({ value, count }) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(value)}
                    onChange={() => toggle(facet.key, value)}
                    className="h-3.5 w-3.5 rounded-sm border-input"
                  />
                  <span className="group-hover:text-foreground transition-colors text-muted-foreground">
                    {value}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </aside>
  );
}
