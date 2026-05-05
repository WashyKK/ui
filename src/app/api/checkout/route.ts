import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  // Accept cart items array { items: [{productId, quantity}] }
  // or legacy single product { productId, quantity }
  const rawItems: { productId: string; quantity: number }[] = Array.isArray(body.items)
    ? body.items
    : body.productId
    ? [{ productId: body.productId, quantity: body.quantity ?? 1 }]
    : [];

  if (!rawItems.length) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const origin = new URL(req.url).origin;

  // Resolve products from DB (never trust client prices)
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const metaItems: { productId: string; quantity: number }[] = [];

  for (const item of rawItems) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const { data: product, error } = await supabaseServer
      .from("products")
      .select("id, name, description, price, image_url")
      .eq("id", item.productId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: `Product not found: ${item.productId}` },
        { status: 404 }
      );
    }

    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(product.price) * 100),
        product_data: {
          name: product.name,
          description: product.description || undefined,
          images: product.image_url ? [product.image_url] : undefined,
        },
      },
      quantity: qty,
    });

    metaItems.push({ productId: product.id, quantity: qty });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: {
      items: JSON.stringify(metaItems),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
