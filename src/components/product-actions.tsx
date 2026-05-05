"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import BuyButton from "@/components/buy-button";

export default function ProductActions({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const [qty, setQty] = useState(1);
  const maxQty = Math.min(stock, 10);

  return (
    <div className="space-y-3">
      {stock > 0 && (
        <div className="flex items-center gap-3">
          <label htmlFor="qty" className="text-sm font-medium">
            Quantity
          </label>
          <select
            id="qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}
      <BuyButton productId={productId} quantity={qty} disabled={stock === 0} />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}
