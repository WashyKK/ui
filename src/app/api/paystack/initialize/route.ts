import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { CartPricingError, generateOrderNumber, priceCart } from "@/lib/orders";
import { getShippingLabel } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const shippingZone = String(body.shippingZone ?? "");
  const phone = body.phone ? String(body.phone).trim() : undefined;

  let priced;
  try {
    priced = await priceCart(body.items ?? [], shippingZone);
  } catch (err) {
    if (err instanceof CartPricingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const orderNumber = await generateOrderNumber();
  // Paystack requires the reference to be unique per transaction. Reusing the
  // order number keeps support conversations to a single identifier.
  const reference = orderNumber;

  // The order exists before the customer reaches the payment page, so an
  // abandoned attempt is a visible pending row rather than nothing at all.
  const { error: insertError } = await supabaseServer.from("orders").insert({
    order_number: orderNumber,
    provider: "paystack",
    provider_ref: reference,
    status: "pending",
    currency: "KES",
    amount_minor: priced.totalKes * 100,
    subtotal_usd: priced.subtotalUsd,
    shipping_usd: priced.shippingUsd,
    fx_rate_usd_kes: priced.fxRate,
    items: priced.items,
    customer_email: email,
    customer_phone: phone ?? null,
    shipping_zone: shippingZone || null,
    shipping_amount: priced.shippingUsd || null,
    quantity: priced.items.reduce((sum, i) => sum + i.quantity, 0),
    amount_total: Math.round(priced.totalUsd * 100),
  });

  if (insertError) {
    return NextResponse.json({ error: "Could not create the order" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email,
      phone,
      amountMinor: priced.totalKes * 100,
      currency: "KES",
      reference,
      callbackUrl: `${origin}/order/${orderNumber}`,
      metadata: {
        order_number: orderNumber,
        shipping_zone: shippingZone,
        shipping_label: shippingZone ? getShippingLabel(shippingZone) : null,
      },
    });

    return NextResponse.json({
      authorizationUrl,
      orderNumber,
      totalKes: priced.totalKes,
      totalUsd: priced.totalUsd,
    });
  } catch (err: any) {
    await supabaseServer
      .from("orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("order_number", orderNumber);
    return NextResponse.json({ error: err?.message ?? "Payment setup failed" }, { status: 502 });
  }
}
