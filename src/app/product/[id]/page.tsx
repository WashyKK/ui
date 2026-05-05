import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Package, FileText, Download } from "lucide-react";
import { supabaseServer } from "@/lib/supabaseServer";
import ProductActions from "@/components/product-actions";

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900">
        Out of Stock
      </span>
    );
  if (stock <= 5)
    return (
      <span className="inline-flex items-center text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900">
        Low Stock · {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900">
      In Stock
    </span>
  );
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { data: p, error } = await supabaseServer
    .from("products")
    .select("id, name, description, price, stock, category, image_url, datasheet_url, created_at, updated_at")
    .eq("id", params.id)
    .single();

  if (error || !p) return notFound();

  const price = Number(p.price);
  const stock = Number(p.stock ?? 0);

  // Build a Product object to pass to client components
  const product = {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    price,
    stock,
    category: p.category ?? "",
    imageUrl: p.image_url ?? undefined,
    datasheetUrl: p.datasheet_url ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href="/store" className="hover:text-foreground transition-colors">Store</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{p.name}</span>
      </nav>

      {/* Main content */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="rounded-2xl border overflow-hidden bg-gray-50 dark:bg-zinc-800 aspect-square relative">
          {p.image_url ? (
            <Image src={p.image_url} alt={p.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground opacity-20" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="space-y-2">
            {p.category && (
              <p className="text-xs uppercase tracking-widest text-accent font-medium">{p.category}</p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums">${price.toFixed(2)}</span>
              <StockBadge stock={stock} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {p.description && (
            <p className="text-sm text-muted-foreground leading-7">{p.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-xl border bg-gray-50 dark:bg-zinc-800/50 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
              <p className="font-medium mt-0.5">{p.category || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Stock</p>
              <p className="font-medium mt-0.5">{stock > 0 ? `${stock} units` : "Unavailable"}</p>
            </div>
          </div>

          {/* Add to Cart */}
          <ProductActions product={product} />

          {/* Datasheet */}
          {p.datasheet_url && (
            <div className="rounded-xl border bg-gray-50 dark:bg-zinc-800/50 p-4 flex items-center gap-4">
              <div className="rounded-lg bg-accent/10 p-2.5 shrink-0">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Product Datasheet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Technical specifications — PDF</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={p.datasheet_url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-muted transition-colors">
                  View
                </a>
                <a href={p.datasheet_url} download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </div>
          )}

          <Link href="/store" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
            ← Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
