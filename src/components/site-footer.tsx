import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * The site had no footer at all.
 *
 * That is not only a design gap: the catalogue was rendered on the client, so
 * there was not one static HTML link to any product anywhere on the domain. A
 * crawler arriving at the homepage found nothing to follow. These category
 * links are a crawlable path into the catalogue.
 */
async function getCategories(): Promise<string[]> {
  const { data } = await supabaseServer
    .from("categories")
    .select("name")
    .order("name")
    .limit(8);
  return (data ?? []).map((c) => c.name).filter(Boolean);
}

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { href: "/", label: "All products" },
      { href: "/account/orders", label: "Order history" },
      { href: "/faq", label: "Shipping & delivery" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/contact", label: "Request a quote" },
      { href: "/faq", label: "FAQ" },
      { href: "/legal/returns", label: "Returns" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/team", label: "About" },
      { href: "/legal/terms", label: "Terms of sale" },
      { href: "/legal/privacy", label: "Privacy" },
    ],
  },
];

export default async function SiteFooter() {
  const categories = await getCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40 mt-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-3">
            <p className="display-headline text-2xl">Elffie</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Industrial sensors, control gear and automation parts. Datasheet on
              every product, dispatched from Nairobi.
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-signal signal-dot" />
              Shipping countrywide
            </p>
          </div>

          {categories.length > 0 && (
            <nav aria-labelledby="footer-categories" className="space-y-3">
              <h2 id="footer-categories" className="label-micro text-muted-foreground">
                Categories
              </h2>
              <ul className="space-y-2 text-sm">
                {categories.map((name) => (
                  <li key={name}>
                    <Link
                      href={`/?category=${encodeURIComponent(name)}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {COLUMNS.map((column) => (
            <nav key={column.heading} className="space-y-3">
              <h2 className="label-micro text-muted-foreground">{column.heading}</h2>
              <ul className="space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t flex flex-wrap gap-x-6 gap-y-2 items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} Elffie Robotics · Nairobi, Kenya
          </p>
          <a
            href="mailto:admin@elffie.com"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            admin@elffie.com
          </a>
        </div>
      </div>
    </footer>
  );
}
