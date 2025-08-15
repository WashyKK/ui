import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

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
    const productId = session.metadata?.productId;
    const quantity = parseInt(session.metadata?.quantity || "1", 10) || 1;
    const amountTotal = session.amount_total ?? 0;
    const email = (session.customer_details && session.customer_details.email) || null;

    if (productId) {
      // Optional: insert order record (if orders table exists)
      try {
        await supabaseServer.from("orders").insert({
          stripe_session_id: session.id,
          product_id: productId,
          quantity,
          amount_total: amountTotal,
          customer_email: email,
        });
      } catch {}

      // Decrement stock
      const { data: prod } = await supabaseServer
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();
      const currentStock = Number(prod?.stock ?? 0);
      const newStock = Math.max(0, currentStock - quantity);
      await supabaseServer
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId);
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
