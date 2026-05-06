import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendOrderConfirmation } from "@/lib/email";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature as string, webhookSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const email = meta.customer_email || session.customer_details?.email || null;
    const shippingZone = meta.shipping_zone || "";
    const shippingAmount = Number(meta.shipping_amount || 0);
    const amountTotal = session.amount_total ?? 0;

    // Parse cart items from metadata
    let cartItems: { productId: string; quantity: number }[] = [];
    try { cartItems = meta.items ? JSON.parse(meta.items) : []; } catch {}
    if (!cartItems.length && meta.productId) {
      cartItems = [{ productId: meta.productId, quantity: parseInt(meta.quantity || "1", 10) }];
    }

    // Decrement stock for all items
    for (const item of cartItems) {
      const { data: prod } = await supabaseServer
        .from("products")
        .select("stock")
        .eq("id", item.productId)
        .single();
      if (prod) {
        await supabaseServer
          .from("products")
          .update({ stock: Math.max(0, Number(prod.stock) - item.quantity) })
          .eq("id", item.productId);
      }
    }

    await supabaseServer.from("orders").upsert({
      stripe_session_id: session.id,
      product_id: cartItems.length === 1 ? cartItems[0].productId : null,
      quantity: cartItems.reduce((s, i) => s + i.quantity, 0),
      amount_total: amountTotal,
      customer_email: email,
      shipping_zone: shippingZone || null,
      shipping_amount: shippingAmount || null,
      cart_items: cartItems.length > 1 ? cartItems : null,
    }, { onConflict: "stripe_session_id" });

    // Send order confirmation email
    if (email && cartItems.length) {
      const resolvedItems = await Promise.all(
        cartItems.map(async (ci) => {
          const { data: p } = await supabaseServer
            .from("products")
            .select("name, price")
            .eq("id", ci.productId)
            .single();
          return { name: p?.name ?? "Product", quantity: ci.quantity, price: Number(p?.price ?? 0) };
        })
      );
      const subtotalUSD = resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0);
      await sendOrderConfirmation({
        to: email,
        orderRef: session.id.slice(-8).toUpperCase(),
        items: resolvedItems,
        subtotalUSD,
        shippingUSD: shippingAmount,
        shippingZone,
        paymentMethod: "stripe",
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
