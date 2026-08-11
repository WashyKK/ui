/**
 * Whether a product is on the shelf.
 *
 * Deliberately separate from stock. Stock is a temporary fact about quantity —
 * a listed part can be out of stock and still collect back-in-stock alerts.
 * Status is an editorial decision about whether it belongs in the catalogue at
 * all.
 */
export const PRODUCT_STATUSES = ["active", "unlisted", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const STATUS_META: Record<
  ProductStatus,
  { label: string; short: string; description: string; tone: "good" | "muted" | "bad" }
> = {
  active: {
    label: "Listed",
    short: "Listed",
    description: "Shown in the catalogue and search, and can be bought.",
    tone: "good",
  },
  unlisted: {
    label: "Unlisted",
    short: "Unlisted",
    description:
      "Hidden from the catalogue, search and sitemap — but anyone with the link can still see it and buy it.",
    tone: "muted",
  },
  archived: {
    label: "Archived",
    short: "Archived",
    description:
      "Retired. Not listed, the link no longer works, and it cannot be added to a cart. Past orders keep their record of it.",
    tone: "bad",
  },
};

/** Anything without the column yet (pre-migration) is treated as listed. */
export function statusOf(row: { status?: string | null } | null | undefined): ProductStatus {
  const s = row?.status;
  return (PRODUCT_STATUSES as readonly string[]).includes(s ?? "")
    ? (s as ProductStatus)
    : "active";
}

/** In the catalogue, search results, sitemap and category counts. */
export function isListed(row: { status?: string | null } | null | undefined): boolean {
  return statusOf(row) === "active";
}

/** Reachable by direct link — unlisted still is, archived is not. */
export function isReachable(row: { status?: string | null } | null | undefined): boolean {
  return statusOf(row) !== "archived";
}

/** Can be priced into a cart and paid for. */
export function isPurchasable(row: { status?: string | null } | null | undefined): boolean {
  return statusOf(row) !== "archived";
}
