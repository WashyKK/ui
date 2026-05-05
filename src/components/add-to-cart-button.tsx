"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { Product } from "@/components/types";

interface Props {
  product: Product;
  quantity?: number;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function AddToCartButton({
  product,
  quantity = 1,
  size = "default",
  className = "",
}: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    if (product.stock === 0) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={product.stock === 0}
      size={size}
      variant={added ? "outline" : "default"}
      className={`gap-2 w-full transition-all ${className}`}
    >
      {added ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {product.stock === 0 ? "Out of Stock" : added ? "Added!" : "Add to Cart"}
    </Button>
  );
}
