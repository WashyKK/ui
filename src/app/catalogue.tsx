"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Grid3X3, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product, toProduct } from "@/components/types";
import Products from "@/components/products";
import SpecFilters, { MobileFilters } from "@/components/spec-filters";
import type { Facet } from "@/lib/attributes";
import { descendantNames, type CategoryNode } from "@/lib/categories";
import { reportSearch } from "@/components/analytics-tracker";

interface StoreProps {
  initialProducts: Product[];
  /** Full category tree, so a parent pill can match its children's products. */
  categoryTree: CategoryNode[];
  facets: Facet[];
  /** productId -> { attributeKey -> values }, for filtering without a round trip. */
  attributeIndex: Record<string, Record<string, string[]>>;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "name", label: "Name A–Z" },
];

function StoreInner({ initialProducts, categoryTree, facets, attributeIndex }: StoreProps) {
  const searchParams = useSearchParams();
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  // The footer links here as /?category=…, which is the crawlable path into
  // the catalogue.
  const [activeCategory, setActiveCategory] = React.useState(
    searchParams.get("category") ?? "all"
  );
  const [sort, setSort] = React.useState("newest");
  const [view, setView] = React.useState<"grid" | "list">("grid");

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/products", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setProducts((data.products || []).map(toProduct)))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);


  // Which categories to offer, and what each one means.
  //
  // Built from the tree rather than from distinct product names: selecting
  // "Motors" has to match a product filed under "Stepper" three levels down,
  // and a parent with no direct products still belongs in the list when its
  // children have some.
  const categoryOptions = React.useMemo(() => {
    if (categoryTree.length === 0) {
      // No tree (or the migration has not run) — fall back to the old behaviour.
      const names = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
      return names.map((name) => ({
        id: name as string,
        label: name as string,
        depth: 0,
        names: [name as string],
        total: products.filter((p) => p.category === name).length,
      }));
    }

    const counted = new Map<string, number>();
    for (const p of products) {
      if (p.category) counted.set(p.category, (counted.get(p.category) ?? 0) + 1);
    }

    return categoryTree
      .map((node) => {
        const names = descendantNames(categoryTree, node.id);
        const total = names.reduce((sum, n) => sum + (counted.get(n) ?? 0), 0);
        return { id: node.id, label: node.name, depth: node.depth, names, total };
      })
      .filter((o) => (o.total ?? 0) > 0);
  }, [categoryTree, products]);

  const filtered = React.useMemo(() => {
    let list = [...products];
    if (activeCategory !== "all") {
      const option = categoryOptions.find((o) => o.id === activeCategory);
      const wanted = new Set(option?.names ?? [activeCategory]);
      list = list.filter((p) => p.category && wanted.has(p.category));
    }
    if (search.trim()) {
      // Part numbers are how buyers actually arrive — someone searching
      // "17HS4401" used to get nothing, because only name, description and
      // category were matched. Punctuation is stripped so "E3Z-D61" finds
      // "E3ZD61" and vice versa.
      const q = search.toLowerCase().trim();
      const loose = q.replace(/[\s\-_./]/g, "");
      list = list.filter((p) => {
        const codes = [p.mpn, p.sku].filter(Boolean).join(" ").toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          codes.includes(q) ||
          codes.replace(/[\s\-_./]/g, "").includes(loose) ||
          (p.manufacturer ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)
        );
      });
    }
    // Spec facets, ANDed across keys and ORed within one — picking 12 V and
    // 24 V means "either voltage", picking 24 V and IP67 means "both".
    for (const facet of facets) {
      const wanted = searchParams.getAll(facet.key);
      if (wanted.length === 0) continue;
      list = list.filter((p) => {
        const values = attributeIndex[p.id]?.[facet.key] ?? [];
        return wanted.some((w) => values.includes(w));
      });
    }

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
    return list;
  }, [products, activeCategory, categoryOptions, search, sort, facets, attributeIndex, searchParams]);

  // Report the search once typing settles, not per keystroke. `filtered` is
  // already computed, so the result count reported is the one actually shown —
  // including zero, which is the number worth having.
  React.useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => {
      reportSearch(
        term,
        filtered.length,
        activeCategory === "all"
          ? null
          : categoryOptions.find((o) => o.id === activeCategory)?.label ?? null
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [search, filtered.length, activeCategory, categoryOptions]);

  return (
    <div className="space-y-6">
      {/* Hero. Tighter on a phone: at py-12 this panel ate 480px of an 844px
          screen before the customer reached the search box, and it is scene
          setting, not merchandise. */}
      <section className="border bg-grid px-5 sm:px-10 py-7 sm:py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-xl">
            <p className="label-micro text-muted-foreground flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-signal signal-dot" />
              In stock · ships from Nairobi
            </p>
            <h1 className="display-headline text-3xl sm:text-6xl mt-3 sm:mt-4">Catalogue</h1>
            <p className="mt-3 sm:mt-4 text-sm text-muted-foreground max-w-md">
              Industrial sensors, control gear and automation components.
              Datasheet on every product. Pay with M-Pesa or card.
            </p>
          </div>
          <dl className="hidden md:grid grid-cols-3 gap-6 shrink-0 text-xs">
            {[
              ["Datasheets", "On every part"],
              ["Delivery", "Countrywide"],
              ["Support", "Same-day replies"],
            ].map(([term, detail]) => (
              <div key={term}>
                <dt className="label-micro text-muted-foreground">{term}</dt>
                <dd className="mt-1">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or part number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <MobileFilters facets={facets} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-sm border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex rounded-sm border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2 transition-colors ${
                view === "grid"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 border-l transition-colors ${
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category pills. A rail on a phone, wrapping from sm up — wrapping at
          375px turned fourteen categories into seven rows of chips that pushed
          every product below the fold. */}
      {!loading && !error && categoryOptions.length > 0 && (
        <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 items-center px-4 sm:px-0 w-max sm:w-auto sm:flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-sm text-sm transition-colors border ${
              activeCategory === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-graphite"
            }`}
          >
            All products
          </button>
          {categoryOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveCategory(option.id)}
              title={option.depth > 0 ? `Within ${option.label}` : undefined}
              className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-sm text-sm transition-colors border inline-flex items-center gap-1.5 ${
                activeCategory === option.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-graphite"
              } ${option.depth > 0 ? "text-xs" : ""}`}
            >
              {option.depth > 0 && <span className="opacity-50 select-none">›</span>}
              {option.label}
              {typeof option.total === "number" && (
                <span className="opacity-60 tabular-nums text-xs">{option.total}</span>
              )}
            </button>
          ))}
        </div>
        </div>
      )}

      {/* Result count */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground -mt-2">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
          {activeCategory !== "all" ? ` in "${categoryOptions.find((o) => o.id === activeCategory)?.label ?? activeCategory}"` : ""}
          {search.trim() ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Products */}
      {facets.length > 0 ? (
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-8 items-start">
          <div className="hidden lg:block">
            <SpecFilters facets={facets} />
          </div>
          <Products products={filtered} loading={loading} error={error} view={view} onRetry={load} />
        </div>
      ) : (
        <Products products={filtered} loading={loading} error={error} view={view} onRetry={load} />
      )}

      {/* Quote CTA */}
      {!loading && !error && (
        <section className="border p-8 text-center mt-4">
          <h2 className="display-headline text-2xl">Can&apos;t find the part?</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Send us the part number and the quantity. If we can source it, you
            get a price and a lead time the same working day.
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link
              href="/contact"
              className="px-5 py-2 rounded-sm bg-foreground text-background text-sm hover:opacity-90 transition-opacity"
            >
              Request a quote
            </Link>
            <Link
              href="/faq"
              className="px-5 py-2 rounded-sm border text-sm hover:bg-muted transition-colors"
            >
              Delivery &amp; returns
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}

/**
 * useSearchParams opts the page into client-side rendering, so it must sit
 * inside a Suspense boundary or the whole route de-opts at build time.
 */
export default function Catalogue(props: StoreProps) {
  return (
    <React.Suspense fallback={<div className="py-24" />}>
      <StoreInner {...props} />
    </React.Suspense>
  );
}
