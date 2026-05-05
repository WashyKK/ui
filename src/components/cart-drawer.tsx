"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Minus, Plus, X, ShoppingCart, CreditCard,
  Loader2, CheckCircle2, AlertCircle, Lock, Smartphone,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";

type MpesaState =
  | { step: "idle" }
  | { step: "form" }
  | { step: "loading" }
  | { step: "sent"; checkoutRequestId: string; amountKES: number }
  | { step: "polling"; checkoutRequestId: string }
  | { step: "success"; receipt?: string }
  | { step: "error"; message: string };

export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice, isOpen, closeCart } = useCart();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [mpesa, setMpesa] = useState<MpesaState>({ step: "idle" });

  const handleStripeCheckout = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
    } finally {
      setStripeLoading(false);
    }
  };

  const handleMpesaPush = async () => {
    setMpesa({ step: "loading" });
    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");
      setMpesa({ step: "sent", checkoutRequestId: data.checkoutRequestId, amountKES: data.amountKES });
    } catch (err: any) {
      setMpesa({ step: "error", message: err.message });
    }
  };

  const pollStatus = async (checkoutRequestId: string) => {
    setMpesa({ step: "polling", checkoutRequestId });
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/mpesa/status?checkoutRequestId=${checkoutRequestId}`);
        const data = await res.json();
        if (data.status === "completed") {
          clearCart();
          setMpesa({ step: "success", receipt: data.receipt });
          return;
        }
        if (data.status === "failed") {
          setMpesa({ step: "error", message: data.message || "Payment was not completed" });
          return;
        }
      } catch {}
    }
    setMpesa({ step: "error", message: "Payment timed out. Check your M-Pesa messages." });
  };

  const resetMpesa = () => { setMpesa({ step: "idle" }); setPhone(""); };

  if (items.length === 0 && mpesa.step !== "success") {
    return (
      <Sheet open={isOpen} onOpenChange={(o) => !o && closeCart()}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Cart
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <ShoppingCart className="h-12 w-12 text-muted-foreground opacity-20" />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Add products from the store to get started.</p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href="/store">Browse Store</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeCart()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart
            {items.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {mpesa.step === "success" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="rounded-full bg-green-50 dark:bg-green-950/40 p-4 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Payment Confirmed!</h3>
              {mpesa.receipt && (
                <p className="text-sm text-muted-foreground mt-1">Receipt: {mpesa.receipt}</p>
              )}
            </div>
            <Button onClick={() => { resetMpesa(); closeCart(); }} asChild>
              <Link href="/store">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 items-start">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-gray-50 dark:bg-zinc-800 border">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No img
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
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-5 text-center tabular-nums">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, Math.min(quantity + 1, product.stock))}
                        disabled={quantity >= product.stock}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      ${(product.price * quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="mt-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-4 space-y-4 bg-gray-50/50 dark:bg-zinc-900/50">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="font-medium">Subtotal</span>
                <span className="text-xl font-bold tabular-nums">${totalPrice.toFixed(2)}</span>
              </div>

              {/* Stripe */}
              <Button
                className="w-full gap-2"
                onClick={handleStripeCheckout}
                disabled={stripeLoading}
              >
                {stripeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {stripeLoading ? "Redirecting…" : "Checkout with Card"}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* M-Pesa */}
              {mpesa.step === "idle" && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                  onClick={() => setMpesa({ step: "form" })}
                >
                  <Smartphone className="h-4 w-4" />
                  Pay with M-Pesa
                </Button>
              )}

              {mpesa.step === "form" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">M-Pesa Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground shrink-0">
                      +254
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="712 345 678"
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={handleMpesaPush}
                      disabled={!phone.trim()}
                    >
                      <Smartphone className="h-4 w-4" />
                      Send STK Push — KES {Math.ceil(totalPrice * Number(process.env.NEXT_PUBLIC_MPESA_USD_TO_KES_RATE ?? 130)).toLocaleString()}
                    </Button>
                    <Button variant="outline" size="icon" onClick={resetMpesa}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {mpesa.step === "loading" && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending STK push…
                </div>
              )}

              {mpesa.step === "sent" && (
                <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 space-y-3">
                  <div className="flex gap-2">
                    <Smartphone className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        STK Push sent!
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                        Check your phone for the M-Pesa prompt and enter your PIN to pay KES {mpesa.amountKES.toLocaleString()}.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => pollStatus(mpesa.checkoutRequestId)}
                    >
                      Confirm Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetMpesa}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {mpesa.step === "polling" && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking payment status…
                </div>
              )}

              {mpesa.step === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-700 dark:text-red-400">{mpesa.message}</p>
                    <button onClick={resetMpesa} className="text-xs underline text-red-600 mt-1">
                      Try again
                    </button>
                  </div>
                </div>
              )}

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Secure payments via Stripe & M-Pesa Daraja
              </p>

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
