"use client";

import { useState } from "react";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  productId: string;
  quantity?: number;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function BuyButton({
  productId,
  quantity = 1,
  disabled = false,
  size = "default",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url as string;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      size={size}
      className={`gap-2 w-full ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {disabled ? "Out of Stock" : loading ? "Redirecting…" : "Buy Now"}
    </Button>
  );
}
