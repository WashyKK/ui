import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getVerifiedUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Callers get their own orders and nobody else's. Taking the address from the
  // query string let anyone read any customer's history by guessing an email.
  const user = await getVerifiedUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const email = user.email;

  const [stripeRes, mpesaRes] = await Promise.all([
    supabaseServer
      .from("orders")
      .select("id, stripe_session_id, amount_total, customer_email, shipping_zone, shipping_amount, cart_items, product_id, quantity, created_at")
      .ilike("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseServer
      .from("mpesa_orders")
      .select("id, checkout_request_id, mpesa_receipt, amount, email, shipping_zone, cart_items, product_id, quantity, status, created_at")
      .ilike("email", email)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Collect all product IDs to resolve names
  const productIds = new Set<string>();
  for (const o of stripeRes.data ?? []) {
    if (o.product_id) productIds.add(o.product_id);
    for (const i of (o.cart_items as any[] | null) ?? []) if (i.productId) productIds.add(i.productId);
  }
  for (const o of mpesaRes.data ?? []) {
    if (o.product_id) productIds.add(o.product_id);
    for (const i of (o.cart_items as any[] | null) ?? []) if (i.id) productIds.add(i.id);
  }

  const { data: products } = productIds.size
    ? await supabaseServer.from("products").select("id, name, price").in("id", Array.from(productIds))
    : { data: [] };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const resolveItems = (order: any, isStripe: boolean) => {
    if (order.cart_items) {
      return (order.cart_items as any[]).map((i) => {
        const pid = isStripe ? i.productId : i.id;
        const p = productMap.get(pid);
        return { name: p?.name ?? "Product", quantity: i.quantity, price: Number(p?.price ?? 0) };
      });
    }
    if (order.product_id) {
      const p = productMap.get(order.product_id);
      return [{ name: p?.name ?? "Product", quantity: order.quantity, price: Number(p?.price ?? 0) }];
    }
    return [];
  };

  const stripeOrders = (stripeRes.data ?? []).map((o) => ({
    id: o.id,
    ref: o.stripe_session_id?.slice(-8).toUpperCase() ?? o.id.slice(-8).toUpperCase(),
    method: "card" as const,
    status: "completed" as const,
    totalUSD: (o.amount_total ?? 0) / 100,
    shippingZone: o.shipping_zone,
    items: resolveItems(o, true),
    createdAt: o.created_at,
  }));

  const mpesaOrders = (mpesaRes.data ?? []).map((o) => ({
    id: o.id,
    ref: (o.mpesa_receipt || o.checkout_request_id?.slice(-8))?.toUpperCase() ?? o.id.slice(-8).toUpperCase(),
    method: "mpesa" as const,
    status: "completed" as const,
    totalKES: o.amount,
    shippingZone: o.shipping_zone,
    items: resolveItems(o, false),
    createdAt: o.created_at,
  }));

  const all = [...stripeOrders, ...mpesaOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ orders: all });
}
