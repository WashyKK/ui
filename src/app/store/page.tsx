"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Grid3X3, List, ShieldCheck, Headphones, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product } from "@/components/types";
import Products from "@/components/products";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "name", label: "Name A–Z" },
];

export default function Store() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [sort, setSort] = React.useState("newest");
  const [view, setView] = React.useState<"grid" | "list">("grid");

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/products", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) =>
        setProducts(
          (data.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: Number(p.price),
            stock: Number(p.stock ?? 0),
            category: p.category ?? "",
            imageUrl: p.image_url ?? undefined,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }))
        )
      )
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const categories = React.useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ).sort();
    return ["all", ...cats];
  }, [products]);

  const filtered = React.useMemo(() => {
    let list = [...products];
    if (activeCategory !== "all")
      list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)
      );
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
  }, [products, activeCategory, search, sort]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border bg-gradient-to-br from-white via-blue-50/40 to-white dark:from-zinc-900 dark:via-blue-950/20 dark:to-zinc-900 px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent font-medium">Elffie Robotics</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">Store</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Research platforms, manipulators, and mobile systems engineered for real‑world deployment.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground border-r pr-5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Secure checkout
              </span>
              <span className="flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-accent" />
                Enterprise support
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-accent" />
                Global shipping
              </span>
            </div>
            <Link href="/admin/login">
              <Button variant="outline" size="sm" className="text-xs h-8">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2 transition-colors ${
                view === "grid"
                  ? "bg-accent text-white"
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
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category pills */}
      {!loading && !error && categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === cat
                  ? "bg-accent text-white border-accent"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {cat === "all" ? "All Products" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground -mt-2">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
          {activeCategory !== "all" ? ` in "${activeCategory}"` : ""}
          {search.trim() ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Products */}
      <Products products={filtered} loading={loading} error={error} view={view} onRetry={load} />

      {/* Enterprise CTA */}
      {!loading && !error && (
        <section className="rounded-2xl border bg-white dark:bg-zinc-900 p-8 text-center mt-4">
          <h2 className="text-xl font-semibold">Need a custom solution?</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Our engineering team works directly with enterprises to design, integrate, and operate tailored robotics platforms at scale.
          </p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <a
              href="mailto:washingtonkigan@gmail.com?subject=Enterprise%20Inquiry%20%E2%80%94%20Elffie%20Store"
              className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
            >
              Contact Sales
            </a>
            <Link
              href="/academy"
              className="px-5 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent hover:text-white transition"
            >
              Join Academy
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
