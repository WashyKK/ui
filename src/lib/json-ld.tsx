import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, siteUrl } from "@/lib/site";
import type { Product } from "@/components/types";
import { productPath } from "@/lib/slug";
import { FAQ_GROUPS } from "@/lib/faq-content";

/**
 * Structured data.
 *
 * Deliberately no AggregateRating or Review: there are no reviews, and
 * fabricating them to win stars in search results is both a Google policy
 * violation and a lie to the customer.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Not user input — every value is built from our own schema below.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    description: SITE_DESCRIPTION,
    email: "admin@elffie.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
  };
}

export function productSchema(product: Product, kesPrice?: number) {
  const url = absoluteUrl(productPath(product));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || SITE_DESCRIPTION,
    url,
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.manufacturer
      ? { brand: { "@type": "Brand", name: product.manufacturer } }
      : {}),
    ...(product.category ? { category: product.category } : {}),
    offers: {
      "@type": "Offer",
      url,
      // Charged in shillings, so that is what the offer states.
      priceCurrency: "KES",
      price: kesPrice ?? undefined,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };
}
