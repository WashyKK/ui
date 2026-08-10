"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/components/types";

/**
 * Product images with thumbnails.
 *
 * An industrial buyer is checking the connector face, the mounting hole pattern,
 * the port layout and the rating label. A single hero shot answers none of
 * those, so the gallery is the difference between a sale and a pre-sales email.
 */
export default function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-sm border bg-muted flex items-center justify-center">
        <span className="label-micro text-muted-foreground">No image</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-sm border bg-muted overflow-hidden">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt || productName}
          fill
          priority
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Product images">
          {images.map((image, i) => (
            <button
              key={image.url}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`relative aspect-square rounded-sm border overflow-hidden bg-muted transition-colors ${
                i === active ? "border-foreground" : "hover:border-graphite"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-contain"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
