/**
 * Product URLs.
 *
 * The catalogue has always addressed products by UUID, and those links are in
 * customers' WhatsApp history and email. So slugs are additive: a product page
 * resolves by slug OR by id, forever. New links use the slug; old ones keep
 * working and redirect to it.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

/** UUIDs are the legacy identifier; anything else is treated as a slug. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function productPath(product: { id: string; slug?: string | null }): string {
  return `/product/${product.slug || product.id}`;
}

/**
 * Build a slug for a product, appending the part number when there is one —
 * two "proximity sensor" listings from different manufacturers should not
 * collide, and the part number is what makes the URL legible to a buyer.
 */
export function buildProductSlug(name: string, mpn?: string | null): string {
  const base = slugify(name);
  const suffix = mpn ? slugify(mpn) : "";
  if (!suffix || base.includes(suffix)) return base;
  return `${base}-${suffix}`.slice(0, 90).replace(/-+$/g, "");
}
