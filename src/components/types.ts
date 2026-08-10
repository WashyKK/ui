// components/types.ts
export interface ProductImage {
  url: string;
  alt?: string;
}

export type RelationKind = "requires" | "accessory" | "alternative" | "spare";

export interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock: number;
  relation: RelationKind;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  categoryId?: string;
  /** Manufacturer part number — what a buyer actually searches for. */
  mpn?: string;
  /** Our internal stock code. */
  sku?: string;
  manufacturer?: string;
  description?: string;
  imageUrl?: string;
  /** Gallery, primary first. Falls back to imageUrl when empty. */
  images?: ProductImage[];
  datasheetUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Map a raw products row onto the client shape, in one place. */
export function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    stock: Number(row.stock ?? 0),
    category: row.category ?? "",
    categoryId: row.category_id ?? undefined,
    sku: row.sku ?? undefined,
    mpn: row.mpn ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    imageUrl: row.image_url ?? undefined,
    images: Array.isArray(row.product_images)
      ? row.product_images
          .slice()
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
          .map((img: any) => ({ url: img.url, alt: img.alt ?? undefined }))
      : undefined,
    datasheetUrl: row.datasheet_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every image for a product, primary first, de-duplicated. */
export function galleryFor(product: Product): ProductImage[] {
  const out: ProductImage[] = [];
  const seen = new Set<string>();
  const push = (img: ProductImage) => {
    if (img.url && !seen.has(img.url)) {
      seen.add(img.url);
      out.push(img);
    }
  };
  if (product.imageUrl) push({ url: product.imageUrl, alt: product.name });
  (product.images ?? []).forEach(push);
  return out;
}
