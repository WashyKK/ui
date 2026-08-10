import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing here is secret — these routes are all authenticated — but they
        // are worthless in an index and burn crawl budget on a small catalogue.
        disallow: ["/admin", "/account", "/checkout", "/auth", "/order/", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
