"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { useCurrency } from "@/context/currency";
import { supabase } from "@/lib/supabaseClient";
import {
  CUSTOMER_STATUS_LABEL, FULFILMENT_STEPS, STATUS_TONE, type OrderStatus,
} from "@/lib/order-status";
import { LAST_ORDER_KEY } from "@/app/checkout/checkout-form";

interface OrderItem { productId: string; name: string; unitPriceUsd: number; quantity: number }
interface Order {
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalUsd: number;
  shippingUsd: number;
  totalKes: number | null;
  shippingLabel: string | null;
  recipientName: string | null;
  deliveryTown: string | null;
  deliveryCounty: string | null;
  deliveryLandmark: string | null;
  pickupPoint: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  companyName: string | null;
  poReference: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  paymentChannel: string | null;
  paymentReceipt: string | null;
  createdAt: string;
}

const TONE_CLASS: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  progress: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  good: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  bad: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export default function OrderView({ orderNumber }: { orderNumber: string }) {
  const { clearCart } = useCart();
  const { format } = useCurrency();

  const [order, setOrder] = useState<Order | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (address: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orderNumber, email: address }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Could not find that order");
    return body.order as Order;
  }, [orderNumber]);

  // Try to resolve the order without asking anything: the email is either on the
  // signed-in session or was stashed at checkout, just before the redirect out.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let candidate = "";
      try {
        const raw = localStorage.getItem(LAST_ORDER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.orderNumber === orderNumber && parsed?.email) candidate = parsed.email;
        }
      } catch {}

      if (!candidate) {
        const { data } = await supabase.auth.getSession();
        candidate = data.session?.user?.email ?? "";
      }

      if (!candidate) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const found = await lookup(candidate);
        if (cancelled) return;
        setOrder(found);
        setEmail(candidate);
        // Paid means the cart became an order; leaving it filled invites a
        // duplicate purchase of the same thing.
        if (found.status !== "pending" && found.status !== "failed") {
          clearCart();
          localStorage.removeItem(LAST_ORDER_KEY);
        }
      } catch {
        // Fall through to the email prompt.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orderNumber, lookup, clearCart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setOrder(await lookup(email.trim()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-sm mx-auto py-20 space-y-5">
        <div className="text-center space-y-2">
          <Package className="h-10 w-10 text-muted-foreground opacity-30 mx-auto" />
          <h1 className="text-xl font-semibold">Order {orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Enter the email address on the order to see it.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.ke"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && (
            <p className="flex gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />{error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show my order"}
          </Button>
        </form>
      </div>
    );
  }

  const tone = STATUS_TONE[order.status];
  const stepIndex = FULFILMENT_STEPS.indexOf(order.status);
  const total = order.subtotalUsd + order.shippingUsd;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <header className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TONE_CLASS[tone]}`}>
            {CUSTOMER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Placed {new Date(order.createdAt).toLocaleDateString("en-KE", {
            day: "numeric", month: "long", year: "numeric",
          })}
          {order.paymentReceipt ? ` · Receipt ${order.paymentReceipt}` : ""}
        </p>
      </header>

      {stepIndex >= 0 && (
        <ol className="flex items-center gap-1" aria-label="Fulfilment progress">
          {FULFILMENT_STEPS.map((step, i) => {
            const done = i <= stepIndex;
            return (
              <li key={step} className="flex-1 min-w-0">
                <div className={`h-1 rounded-full ${done ? "bg-foreground" : "bg-muted"}`} />
                <p className={`mt-2 text-[11px] truncate ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  {i === stepIndex && <Check className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
                  {CUSTOMER_STATUS_LABEL[step]}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <div className="flex gap-3 rounded-lg border bg-card p-4">
          <Truck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">On the way with {order.carrier ?? "our courier"}</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">{order.trackingNumber}</p>
          </div>
        </div>
      )}

      <section className="rounded-lg border bg-card divide-y">
        {order.items.map((item) => (
          <div key={item.productId} className="flex justify-between gap-4 p-4 text-sm">
            <div className="min-w-0">
              <p className="leading-snug">{item.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">Qty {item.quantity}</p>
            </div>
            <p className="tabular-nums shrink-0">{format(item.unitPriceUsd * item.quantity)}</p>
          </div>
        ))}
        <div className="p-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span className="tabular-nums">{format(order.subtotalUsd)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping{order.shippingLabel ? ` — ${order.shippingLabel}` : ""}</span>
            <span className="tabular-nums">{format(order.shippingUsd)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1.5 border-t">
            <span>Total</span>
            <span className="tabular-nums">
              {order.totalKes ? `KSh ${order.totalKes.toLocaleString()}` : format(total)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Delivering to</p>
          {order.recipientName && <p>{order.recipientName}</p>}
          {order.deliveryTown && (
            <p className="text-muted-foreground">
              {order.deliveryTown}{order.deliveryCounty ? `, ${order.deliveryCounty}` : ""}
            </p>
          )}
          {order.deliveryLandmark && <p className="text-muted-foreground">{order.deliveryLandmark}</p>}
          {order.pickupPoint && <p className="text-muted-foreground">Pickup: {order.pickupPoint}</p>}
          {order.addressLine1 && (
            <p className="text-muted-foreground">
              {order.addressLine1}{order.addressCity ? `, ${order.addressCity}` : ""}
              {order.addressCountry ? `, ${order.addressCountry}` : ""}
            </p>
          )}
        </div>

        {(order.companyName || order.poReference) && (
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Billing</p>
            {order.companyName && <p>{order.companyName}</p>}
            {order.poReference && (
              <p className="text-muted-foreground">PO {order.poReference}</p>
            )}
          </div>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Questions about this order? Email{" "}
        <a href="mailto:admin@elffie.com" className="underline hover:text-foreground">admin@elffie.com</a>{" "}
        and quote <strong className="text-foreground">{order.orderNumber}</strong>.
      </p>

      <Button variant="outline" asChild><Link href="/">Back to the catalogue</Link></Button>
    </div>
  );
}
