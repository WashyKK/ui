"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Package, AlertCircle, ShoppingCart, Lock, FileText } from "lucide-react";
import { Product } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BuyButton from "@/components/buy-button";

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  view?: "grid" | "list";
  onRetry?: () => void;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
        Out of Stock
      </span>
    );
  if (stock <= 5)
    return (
      <span className="inline-flex items-center text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
        Low Stock · {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900">
      In Stock
    </span>
  );
}

function ProductImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [err, setErr] = React.useState(false);
  if (!src || err) {
    return (
      <div
        className={`bg-gray-100 dark:bg-zinc-800 flex items-center justify-center ${className ?? ""}`}
      >
        <Package className="h-10 w-10 text-muted-foreground opacity-20" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
      onError={() => setErr(true)}
    />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border overflow-hidden bg-white dark:bg-zinc-900">
          <Skeleton className="w-full h-52" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-xl border p-4 bg-white dark:bg-zinc-900">
          <Skeleton className="h-24 w-24 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

const Products: React.FC<Props> = ({ products, loading, error, view = "grid", onRetry }) => {
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);

  const openModal = (p: Product) => {
    setSelected(p);
    setQty(1);
  };

  if (loading) {
    return view === "list" ? <ListSkeleton /> : <GridSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to load products</h3>
        <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
        {onRetry && (
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-14 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
        <h3 className="text-xl font-semibold">No products found</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Try adjusting your search or category filter, or contact us for a tailored solution.
        </p>
        <a
          href="mailto:washingtonkigan@gmail.com?subject=Product%20Inquiry%20%E2%80%94%20Elffie%20Store"
          className="mt-5 inline-block px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
        >
          Contact Sales
        </a>
      </div>
    );
  }

  return (
    <>
      {view === "list" ? (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => openModal(product)}
              className="text-left group w-full rounded-xl border bg-white dark:bg-zinc-900 hover:border-accent hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="flex gap-4 p-4 items-start">
                <div className="relative h-24 w-24 rounded-lg overflow-hidden shrink-0 bg-gray-50 dark:bg-zinc-800">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-base group-hover:text-accent transition-colors">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold shrink-0 tabular-nums">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                    <StockBadge stock={product.stock} />
                    {product.datasheetUrl && (
                      <span className="flex items-center gap-1 text-xs text-accent font-medium">
                        <FileText className="h-3.5 w-3.5" />
                        Datasheet
                      </span>
                    )}
                    <Link
                      href={`/product/${product.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View details
                    </Link>
                  </div>
                </div>
                <div
                  className="shrink-0 hidden sm:block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <BuyButton
                    productId={product.id}
                    disabled={product.stock === 0}
                    size="sm"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => openModal(product)}
              className="text-left group w-full rounded-xl border bg-white dark:bg-zinc-900 hover:border-accent hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <div className="relative h-52 overflow-hidden bg-gray-50 dark:bg-zinc-800">
                <ProductImage src={product.imageUrl} alt={product.name} />
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1 rounded-full">
                      Out of Stock
                    </span>
                  </div>
                )}
                {product.category && (
                  <span className="absolute top-3 left-3 text-xs font-medium bg-white/90 dark:bg-zinc-900/90 text-foreground px-2.5 py-1 rounded-full border border-border/50 backdrop-blur-sm">
                    {product.category}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base leading-snug group-hover:text-accent transition-colors">
                    {product.name}
                  </h3>
                  <StockBadge stock={product.stock} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-bold tabular-nums">
                    ${product.price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-3">
                    {product.datasheetUrl && (
                      <span className="flex items-center gap-1 text-xs text-accent font-medium">
                        <FileText className="h-3.5 w-3.5" />
                        Datasheet
                      </span>
                    )}
                    <Link
                      href={`/product/${product.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick-view modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-2xl w-full rounded-2xl border bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 bg-gray-50 dark:bg-zinc-800">
              <ProductImage src={selected.imageUrl} alt={selected.name} />
              <button
                className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white p-2 transition"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {selected.category && (
                <span className="absolute bottom-3 left-3 text-xs font-medium bg-white/90 dark:bg-zinc-900/90 px-2.5 py-1 rounded-full border backdrop-blur-sm">
                  {selected.category}
                </span>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-2xl font-semibold leading-tight">{selected.name}</h3>
                  <StockBadge stock={selected.stock} />
                </div>
                <span className="text-2xl font-bold tabular-nums shrink-0">
                  ${selected.price.toFixed(2)}
                </span>
              </div>

              {selected.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selected.description}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {selected.stock > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label htmlFor="modal-qty" className="text-sm font-medium">
                      Qty
                    </label>
                    <select
                      id="modal-qty"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {Array.from(
                        { length: Math.min(selected.stock, 10) },
                        (_, i) => i + 1
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex-1 min-w-[140px]">
                  <BuyButton
                    productId={selected.id}
                    quantity={qty}
                    disabled={selected.stock === 0}
                  />
                </div>
                <Link
                  href={`/product/${selected.id}`}
                  className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                  onClick={() => setSelected(null)}
                >
                  Full details →
                </Link>
              </div>

              {selected.datasheetUrl && (
                <div className="flex items-center gap-3 pt-1 border-t">
                  <FileText className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm font-medium">Datasheet</span>
                  <a
                    href={selected.datasheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent underline underline-offset-4 hover:opacity-80"
                  >
                    View PDF
                  </a>
                  <a
                    href={selected.datasheetUrl}
                    download
                    className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Download
                  </a>
                </div>
              )}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Lock className="h-3 w-3" />
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
