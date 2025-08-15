"use client";

import { Button } from "@/components/ui/button";

export default function BuyButton({ productId, quantity = 1 }: { productId: string; quantity?: number }) {
  const onClick = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url as string;
    } catch {}
  };
  return (
    <Button onClick={onClick}>Buy Now</Button>
  );
}

