import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabaseServer";
import ProductActions from "@/components/product-actions";
import ProductGallery from "@/components/product-gallery";
import ProductDescription from "@/components/product-description";
import RelatedProducts from "@/components/related-products";
import { PriceDisplay } from "@/components/price-display";
import { galleryFor, toProduct, type Product, type RelatedProduct } from "@/components/types";
import { isUuid, productPath } from "@/lib/slug";
import { findProductBy } from "@/lib/products-query";
import { absoluteUrl } from "@/lib/site";
import { getUsdToKesRate, usdToKes } from "@/lib/fx";
import { JsonLd, breadcrumbSchema, productSchema } from "@/lib/json-ld";
import { attributesFor } from "@/lib/attributes.server";
import { isListed, isReachable, statusOf } from "@/lib/product-status";
import StockAlertForm from "@/components/stock-alert-form";
import { DocumentList, LinkList, SnippetList } from "@/components/product-resources";
import { loadProductResources } from "@/lib/product-resources.server";

/** Resolve by slug or by legacy UUID — old links must keep working. */
async function findProduct(idOrSlug: string) {
  return findProductBy(isUuid(idOrSlug) ? "id" : "slug", idOrSlug);
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const row = await findProduct(id);
  if (!row || !isReachable(row)) return {};

  const product = toProduct(row);
  const title = product.mpn ? `${product.name} — ${product.mpn}` : product.name;
  const description =
    (product.description ?? "").replace(/[#*`]/g, "").trim().slice(0, 155) ||
    `${product.name}. In stock, datasheet included, shipped countrywide from Nairobi.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(productPath({ id: row.id, slug: row.slug })) },
    // Unlisted is reachable but deliberately not promoted, so keep it out of
    // the index rather than letting search undo the decision.
    ...(isListed(row) ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(productPath({ id: row.id, slug: row.slug })),
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined,
    },
    twitter: {
      card: product.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="label-micro border px-2 py-1 text-muted-foreground">Out of stock</span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="label-micro border px-2 py-1">Low stock · {stock} left</span>
    );
  }
  return (
    <span className="label-micro border px-2 py-1 inline-flex items-center gap-1.5">
      <span className="inline-block size-1.5 rounded-full bg-signal signal-dot" />
      In stock
    </span>
  );
}

/**
 * Spec rows worth showing. Catalogue metadata first, then the real attributes —
 * which is the only place those values are readable outside the PDF datasheet,
 * where neither Google nor this site's own search can reach them.
 */
function specRows(
  p: any,
  stock: number,
  attributes: { label: string; value: string; unit: string | null }[]
) {
  const base: [string, string][] = [
    ["Part number", p.mpn],
    ["Manufacturer", p.manufacturer],
    ["Stock code", p.sku],
    ["Category", p.category],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  const specs: [string, string][] = attributes.map((a) => [
    a.label,
    a.unit ? `${a.value} ${a.unit}` : a.value,
  ]);

  return [
    ...base,
    ...specs,
    ["Availability", stock > 0 ? `${stock} in stock` : "On request"] as [string, string],
  ];
}

async function getRelated(productId: string): Promise<RelatedProduct[]> {
  const { data } = await supabaseServer
    .from("product_relations")
    .select("relation, position, related:products!product_relations_related_id_fkey(id, name, price, stock, image_url)")
    .eq("product_id", productId)
    .order("position");

  return (data ?? [])
    .map((row: any) => {
      const r = Array.isArray(row.related) ? row.related[0] : row.related;
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        price: Number(r.price),
        stock: Number(r.stock ?? 0),
        imageUrl: r.image_url ?? undefined,
        relation: row.relation,
      };
    })
    .filter(Boolean) as RelatedProduct[];
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await findProduct(id);
  // Archived means retired: the link stops working. Unlisted keeps working, so
  // a part you will still supply on request can be shared directly.
  if (!p || !isReachable(p)) return notFound();

  // Old UUID links keep resolving, but send them on to the readable URL so the
  // canonical form is the one that gets shared and indexed.
  if (isUuid(id) && p.slug) redirect(`/product/${p.slug}`);

  const product = toProduct(p);
  const images = galleryFor(product);
  const attributes = await attributesFor(product.id);
  const specs = specRows(p, product.stock, attributes);

  // Relations live in a table that may not exist yet on an un-migrated database.
  const related = await getRelated(product.id).catch(() => [] as RelatedProduct[]);
  const { documents, links, snippets } = await loadProductResources(product.id);

  // The single datasheet_url is the fallback when product_documents has not
  // been populated (or migrated) yet, so a product never loses its PDF.
  const shownDocuments = documents.length
    ? documents
    : product.datasheetUrl
      ? [{ url: product.datasheetUrl, title: "Datasheet", kind: "datasheet" }]
      : [];

  // JSON-LD advertises what is charged today; a stale list price here would
  // be a price mismatch in search results.
  const kesPrice = usdToKes(product.price, getUsdToKesRate());

  return (
    <div className="space-y-14">
      <JsonLd data={productSchema(product, kesPrice)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Catalogue", path: "/store" },
          ...(product.category
            ? [{ name: product.category, path: `/store?category=${encodeURIComponent(product.category)}` }]
            : []),
          { name: product.name, path: productPath({ id: product.id, slug: p.slug }) },
        ])}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/store" className="hover:text-foreground transition-colors">Catalogue</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link
              href={`/store?category=${encodeURIComponent(product.category)}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground truncate max-w-[220px]">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={images} productName={product.name} />

        <div className="space-y-6">
          <div className="space-y-3">
            {product.mpn && (
              <p className="label-micro text-muted-foreground">
                {product.manufacturer ? `${product.manufacturer} · ` : ""}
                {product.mpn}
              </p>
            )}
            <h1 className="display-headline text-3xl sm:text-4xl">{product.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <PriceDisplay
                usd={product.price}
                wasUsd={product.onSale ? product.listPrice : null}
                percentOff={product.percentOff}
                className="text-3xl font-semibold tabular-nums"
              />
              <StockBadge stock={product.stock} />
            </div>
          </div>

          {product.stock > 0 ? (
            <ProductActions product={product} />
          ) : (
            <StockAlertForm productId={product.id} />
          )}

          {specs.length > 0 && (
            <div>
              <h2 className="label-micro text-muted-foreground mb-3">Specification</h2>
              <dl className="border-t">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex gap-4 py-2.5 border-b text-sm">
                    <dt className="text-muted-foreground w-40 shrink-0">{key}</dt>
                    <dd className="font-mono text-[13px]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div>
              <h2 className="label-micro text-muted-foreground mb-3">Details</h2>
              <ProductDescription source={product.description} />
            </div>
          )}
        </div>
      </div>

      {(shownDocuments.length > 0 || links.length > 0) && (
        <div className="grid gap-10 lg:grid-cols-2">
          <DocumentList documents={shownDocuments} />
          <LinkList links={links} />
        </div>
      )}

      <SnippetList snippets={snippets} />

      <RelatedProducts related={related} />
    </div>
  );
}
