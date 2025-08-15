import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.productId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  // Fetch product from DB to avoid trusting client price
  const { data: product, error } = await supabaseServer
    .from("products")
    .select("id, name, description, price, image_url")
    .eq("id", body.productId)
    .single();
  if (error || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  const origin = new URL(req.url).origin;
  const quantity = Math.max(1, Number(body.quantity || 1));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(product.price) * 100),
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
          },
        },
        quantity,
      },
    ],
    metadata: {
      productId: product.id,
      quantity: String(quantity),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
