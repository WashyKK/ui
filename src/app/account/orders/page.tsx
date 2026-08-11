"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCurrency } from "@/context/currency";
import { getShippingLabel } from "@/lib/shipping";
import { Loader2, ShoppingBag, CreditCard, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem { name: string; quantity: number; price: number; }
interface Order {
  id: string;
  ref: string;
  method: "card" | "mpesa";
  status: string;
  totalUSD?: number;
  totalKES?: number;
  shippingZone: string | null;
  items: OrderItem[];
  createdAt: string;
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const { format } = useCurrency();

  const displayTotal = order.method === "card"
    ? format(order.totalUSD ?? 0)
    : `KSh ${(order.totalKES ?? 0).toLocaleString()}`;

  const dateStr = new Date(order.createdAt).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="rounded-xl border bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
            order.method === "card"
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600"
              : "bg-green-50 dark:bg-green-950/40 text-green-600"
          }`}>
            {order.method === "card"
              ? <CreditCard className="h-4 w-4" />
              : <Smartphone className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Order #{order.ref}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{dateStr} · {order.method === "card" ? "Card" : "M-Pesa"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold tabular-nums">{displayTotal}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-3 bg-gray-50/50 dark:bg-zinc-800/20">
          {/* Items */}
          <div className="space-y-2">
            {order.items.length > 0 ? order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                <span className="tabular-nums">{format(item.price * item.quantity)}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Item details unavailable</p>
            )}
          </div>

          {/* Shipping */}
          {order.shippingZone && (
            <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t">
              <span>Shipping — {getShippingLabel(order.shippingZone)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between font-semibold pt-1 border-t">
            <span>Total paid</span>
            <span className="tabular-nums">{displayTotal}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userEmail = data.session?.user?.email ?? null;
      setEmail(userEmail);
      setSignedIn(!!userEmail);

      if (userEmail) {
        const res = await fetch("/api/account/orders", {
          headers: { Authorization: `Bearer ${data.session!.access_token}` },
        });
        const d = await res.json();
        setOrders(d.orders ?? []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-30 mx-auto" />
        <h1 className="text-xl font-semibold">Sign in to view your orders</h1>
        <p className="text-sm text-muted-foreground">
          Your order history is linked to your account. Sign in with Google to see your past orders.
        </p>
        <Link href="/admin/login">
          <Button className="mt-2">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Order History</h1>
        <p className="text-sm text-muted-foreground mt-1">Orders placed with {email}</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-20 mx-auto" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">Your completed orders will appear here.</p>
          <Link href="/">
            <Button variant="outline" className="mt-2">Browse Store</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
