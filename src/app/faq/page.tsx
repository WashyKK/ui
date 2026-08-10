import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_GROUPS } from "@/lib/faq-content";

export const metadata: Metadata = {
  title: "Support & FAQ",
  description:
    "Delivery times, payment methods, datasheets, warranty and bulk pricing for Elffie Robotics.",
};

export default function FaqPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <p className="label-micro text-muted-foreground mb-3">Support</p>
      <h1 className="display-headline text-4xl sm:text-5xl mb-4">Questions</h1>
      <p className="text-muted-foreground mb-12 max-w-prose">
        The things people ask most. If yours is not here,{" "}
        <Link href="/contact" className="underline hover:text-foreground">send it over</Link> —
        we answer the same working day.
      </p>

      <div className="space-y-12">
        {FAQ_GROUPS.map((group) => (
          <section key={group.heading}>
            <h2 className="label-micro text-muted-foreground mb-5">{group.heading}</h2>
            <dl className="space-y-6">
              {group.items.map((item) => (
                <div key={item.q} className="border-t pt-4">
                  <dt className="text-sm font-medium mb-1.5">{item.q}</dt>
                  <dd className="text-sm text-muted-foreground leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-sm border p-6">
        <h2 className="font-medium mb-1.5">Still stuck?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Send us the part number and what you are building. We would rather talk
          you out of the wrong part than sell it to you.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-sm bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition-opacity"
        >
          Ask a question
        </Link>
      </div>
    </div>
  );
}
