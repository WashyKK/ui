import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import { absoluteUrl } from "@/lib/site";
import { productPath } from "@/lib/slug";
import { LEGAL_PAGES } from "@/lib/legal-content";

export const revalidate = 3600;

/**
 * With `/` redirecting to /store and /store rendering its catalogue on the
 * client, a crawler had no path to any product page. This is that path.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/store"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/team"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...Object.keys(LEGAL_PAGES).map((slug) => ({
      url: absoluteUrl(`/legal/${slug}`),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  // select * rather than naming slug: on a database that has not had
  // product_slugs.sql applied, naming a missing column fails the whole query
  // and the sitemap silently loses every product.
  const { data: products } = await supabaseServer
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p: any) => ({
    url: absoluteUrl(productPath(p)),
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
