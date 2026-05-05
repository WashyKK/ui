"use client";

import { useState } from "react";
import AddToCartButton from "@/components/add-to-cart-button";
import { Product } from "@/components/types";

export default function ProductActions({
  product,
}: {
  product: Product;
}) {
  const [qty, setQty] = useState(1);
  const maxQty = Math.min(product.stock, 10);

  return (
    <div className="space-y-3">
      {product.stock > 0 && (
        <div className="flex items-center gap-3">
          <label htmlFor="qty" className="text-sm font-medium">Quantity</label>
          <select
            id="qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
      <AddToCartButton product={product} quantity={qty} />
    </div>
  );
}
