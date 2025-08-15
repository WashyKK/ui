// components/Products.tsx
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Product } from "@/components/types";
import Link from "next/link";
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BuyButton from "@/components/buy-button";

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        const mapped: Product[] = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          price: Number(p.price),
          stock: Number(p.stock ?? 0),
          category: p.category ?? "",
          imageUrl: p.image_url ?? undefined,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setProducts(mapped);
      } catch (e: any) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const [selected, setSelected] = useState<Product | null>(null);

  if (loading)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-full">
            <Skeleton className="w-full h-48 rounded-lg" />
            <div className="mt-2 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  if (error) return <div className="mt-6 text-sm text-red-600">Failed to load: {error}</div>;

  if (!products.length) {
    return (
      <div className="mt-6 rounded-2xl border bg-white dark:bg-zinc-900 p-8 text-center">
        <h3 className="text-xl font-semibold">No products available</h3>
        <p className="text-sm text-muted-foreground mt-1">We’re curating the next batch of robotics platforms. Check back soon or contact us for a tailored solution.</p>
        <div className="mt-4">
          <a href="mailto:washingtonkigan@gmail.com?subject=Product%20Inquiry%20%E2%80%94%20Elffie%20Store" className="px-4 py-2 rounded-md bg-accent text-white hover:opacity-90">Contact Sales</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <button key={product.id} onClick={() => setSelected(product)} className="text-left">
            <Card className="w-full">
              <Image
                src={product.imageUrl || "/placeholder.png"}
                alt={product.name}
                width={800}
                height={384}
                className="w-full h-48 object-cover"
              />
              <CardContent>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
                <CardFooter>
                  <span className="text-lg font-bold">${" "}{product.price.toFixed(2)}</span>
                  <div className="ml-auto flex gap-2">
                    <Link href={`/product/${product.id}`} className="text-sm underline underline-offset-4">Details</Link>
                  </div>
                </CardFooter>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div
            className="max-w-2xl w-full rounded-2xl border bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Image
                src={selected.imageUrl || "/placeholder.png"}
                alt={selected.name}
                width={1200}
                height={600}
                className="w-full h-64 object-cover"
              />
              <button
                className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-black/50 text-white p-2"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 grid gap-2">
              <h3 className="text-2xl font-semibold">{selected.name}</h3>
              <p className="text-muted-foreground">{selected.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold">${" "}{selected.price.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">Stock: {selected.stock}</span>
              </div>
              <div className="mt-4">
                <BuyButton productId={selected.id} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
