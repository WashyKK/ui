import Link from "next/link";
import Image from "next/image";
import type { RelatedProduct, RelationKind } from "@/components/types";
import { PriceDisplay } from "@/components/price-display";

/**
 * Curated relations, not "more from this category".
 *
 * Same-category browse would show a buyer four more stepper motors when what
 * they are missing is the driver board. These groups answer the question the
 * product page otherwise dead-ends on: what else do I need to make this work?
 */
const GROUPS: { kind: RelationKind; heading: string; blurb: string }[] = [
  { kind: "requires", heading: "Needed to run this", blurb: "This part will not work without these." },
  { kind: "accessory", heading: "Pairs with", blurb: "Commonly bought together." },
  { kind: "spare", heading: "Spares", blurb: "Consumables and replacement parts." },
  { kind: "alternative", heading: "Alternatives", blurb: "Similar specification, different trade-offs." },
];

export default function RelatedProducts({ related }: { related: RelatedProduct[] }) {
  if (related.length === 0) return null;

  return (
    <div className="space-y-10">
      {GROUPS.map(({ kind, heading, blurb }) => {
        const items = related.filter((r) => r.relation === kind);
        if (items.length === 0) return null;

        return (
          <section key={kind}>
            <h2 className="label-micro text-muted-foreground mb-1">{heading}</h2>
            <p className="text-xs text-muted-foreground mb-4">{blurb}</p>

            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={`/product/${item.id}`} className="group block">
                    <div className="relative aspect-square rounded-sm border bg-muted overflow-hidden mb-2">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                          sizes="(max-width: 768px) 45vw, 22vw"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center label-micro text-muted-foreground">
                          No image
                        </span>
                      )}
                      {item.stock <= 0 && (
                        <span className="absolute left-1.5 bottom-1.5 label-micro bg-background border px-1.5 py-0.5">
                          Out of stock
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-snug group-hover:underline">{item.name}</p>
                    <p className="text-sm font-medium mt-0.5">
                      <PriceDisplay usd={item.price} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
