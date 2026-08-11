/**
 * What a product actually costs right now.
 *
 * One place, used by the server when it prices a cart and by the client when it
 * renders a price. If these two ever disagree, a customer sees one number and
 * is charged another — so neither side gets its own copy of the rule.
 */
export interface Priceable {
  price: number | string;
  sale_price?: number | string | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
}

export interface EffectivePrice {
  /** What they pay, in USD. */
  price: number;
  /** The struck-through original, only when a discount is live. */
  wasPrice: number | null;
  onSale: boolean;
  /** Rounded, for a badge. Null when not on sale. */
  percentOff: number | null;
  /** When the discount stops, if it has an end. */
  endsAt: string | null;
}

/**
 * A sale is live when a sale price exists, is genuinely lower, and now falls
 * inside the window. Both bounds are optional: no start means "already", no end
 * means "until someone removes it".
 */
export function effectivePrice(product: Priceable, now: Date = new Date()): EffectivePrice {
  const list = Number(product.price) || 0;
  const sale = product.sale_price === null || product.sale_price === undefined
    ? null
    : Number(product.sale_price);

  const started = !product.sale_starts_at || new Date(product.sale_starts_at) <= now;
  const notEnded = !product.sale_ends_at || new Date(product.sale_ends_at) > now;

  const live =
    sale !== null && Number.isFinite(sale) && sale >= 0 && sale < list && started && notEnded;

  if (!live) {
    return { price: list, wasPrice: null, onSale: false, percentOff: null, endsAt: null };
  }

  return {
    price: sale!,
    wasPrice: list,
    onSale: true,
    percentOff: list > 0 ? Math.round(((list - sale!) / list) * 100) : null,
    endsAt: product.sale_ends_at ?? null,
  };
}

/** Convenience for the many call sites that only want the number. */
export function priceOf(product: Priceable, now?: Date): number {
  return effectivePrice(product, now).price;
}
