"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ShoppingCart, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { useCurrency } from "@/context/currency";

/**
 * The cart, and only the cart.
 *
 * This used to be the entire checkout — email, shipping zone, phone number and
 * two payment buttons crammed into a 380px slide-over. That was the last thing
 * someone saw before committing to a six-figure shilling order. Collecting an
 * address and payment now happens on /checkout, where there is room for it.
 */
export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice, isOpen, closeCart } = useCart();
  const { format } = useCurrency();

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart
            {itemCount > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground opacity-20" />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Add something from the catalogue to get started.
            </p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href="/">Browse the catalogue</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 items-start">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-muted border">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt="" fill className="object-contain p-1" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug truncate">{product.name}</p>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        aria-label={`Reduce quantity of ${product.name}`}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-5 text-center tabular-nums">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, Math.min(quantity + 1, product.stock))}
                        disabled={quantity >= product.stock}
                        aria-label={`Increase quantity of ${product.name}`}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {format(product.price * quantity)}
                    </p>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      aria-label={`Remove ${product.name}`}
                      className="mt-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t px-5 py-4 space-y-3 bg-muted/30">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">{format(totalPrice)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping is calculated at checkout.
              </p>

              <Button className="w-full gap-2" onClick={closeCart} asChild>
                <Link href="/checkout">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <button
                onClick={clearCart}
                className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
