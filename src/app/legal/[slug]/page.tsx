import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/legal-content";

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = LEGAL_PAGES[params.slug];
  if (!page) return {};
  return { title: page.title, description: page.summary };
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const page = LEGAL_PAGES[params.slug];
  if (!page) notFound();

  return (
    <article className="max-w-2xl mx-auto py-6">
      <p className="label-micro text-muted-foreground mb-3">Legal</p>
      <h1 className="display-headline text-4xl mb-3">{page.title}</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated {page.updated}
      </p>

      <div className="space-y-8">
        {page.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-base font-semibold">{section.heading}</h2>
            {section.body.map((paragraph, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-steel select-none">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mt-12 pt-6 border-t text-sm text-muted-foreground">
        Questions about this page? Email{" "}
        <a href="mailto:admin@elffie.com" className="underline hover:text-foreground">
          admin@elffie.com
        </a>
        .
      </p>
    </article>
  );
}
