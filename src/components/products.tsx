// components/Products.tsx
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Product } from "@/components/types";
import Link from "next/link";
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { X } from "lucide-react";

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

  if (loading) return <div>Loading products…</div>;
  if (error) return <div className="text-red-600">Failed to load: {error}</div>;

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
                  <Link href={`/product/${product.id}`} className="text-blue-500 hover:underline ml-2 hidden">
                    View Details
                  </Link>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
