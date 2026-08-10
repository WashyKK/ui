/**
 * The site's public origin.
 *
 * Order matters. elffie.com is Cloudflare-proxied in front of Vercel, so
 * VERCEL_URL is a *.vercel.app deployment host, not the address anyone visits.
 * Falling back to it first — the usual recipe — would emit canonical URLs and
 * OG image links pointing at preview domains, which is worse than emitting none.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Set by Vercel to the project's production domain, custom domain included.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = "Elffie Robotics";
export const SITE_DESCRIPTION =
  "Industrial sensors, control gear and automation components, with a datasheet on every product. Shipped countrywide from Nairobi.";
