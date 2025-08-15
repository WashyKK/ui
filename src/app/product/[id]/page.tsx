import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import BuyButton from "@/components/buy-button";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { data: p, error } = await supabaseServer
    .from("products")
    .select("id, name, description, price, stock, category, image_url, created_at, updated_at")
    .eq("id", params.id)
    .single();

  if (error || !p) return notFound();

  const price = Number(p.price);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border overflow-hidden">
          <Image
            src={p.image_url || "/placeholder.png"}
            alt={p.name}
            width={1600}
            height={1200}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
            {p.category && (
              <p className="text-sm text-muted-foreground mt-1">{p.category}</p>
            )}
          </div>
          {p.description && (
            <p className="text-sm text-muted-foreground leading-6">{p.description}</p>
          )}
          <div className="flex items-center gap-6">
            <span className="text-2xl font-semibold">${price.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">Stock: {p.stock}</span>
          </div>
          <div className="pt-2">
            <BuyButton productId={p.id} />
          </div>
          <div className="pt-2">
            <Link href="/store" className="text-sm underline underline-offset-4">Back to Store</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

