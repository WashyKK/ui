import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { CartPricingError, generateOrderNumber, priceCart, settleOrder } from "@/lib/orders";
import { getShippingLabel } from "@/lib/shipping";
import { isDomesticZone, isValidKraPin, normalizeKenyanPhone } from "@/lib/kenya";
import { GiftCardError, redeemGiftCard } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

/** Trim to a value worth storing, or null — never an empty string. */
const str = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s.slice(0, 500) : null;
};

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
  const rawPhone = body.phone ? String(body.phone).trim() : "";
  const phone = rawPhone ? normalizeKenyanPhone(rawPhone) ?? rawPhone : undefined;

  const d = body.delivery ?? {};
  const b = body.business ?? {};

  if (!String(d.recipientName ?? "").trim()) {
    return NextResponse.json({ error: "A recipient name is required" }, { status: 400 });
  }
  if (isDomesticZone(shippingZone) && !String(d.town ?? "").trim()) {
    return NextResponse.json({ error: "A delivery town is required" }, { status: 400 });
  }
  if (!isDomesticZone(shippingZone) && shippingZone && !String(d.line1 ?? "").trim()) {
    return NextResponse.json({ error: "A street address is required" }, { status: 400 });
  }
  if (b.kraPin && !isValidKraPin(String(b.kraPin))) {
    return NextResponse.json({ error: "That KRA PIN is not valid" }, { status: 400 });
  }

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

  // Gift card, applied to the server's own total — never to an amount the
  // browser supplied. The card is charged only after the order row exists, so a
  // failure between the two cannot spend credit against nothing.
  const dueMinor = priced.totalKes * 100;
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
    amount_minor: dueMinor,
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

    recipient_name: str(d.recipientName),
    delivery_county: str(d.county),
    delivery_town: str(d.town),
    delivery_landmark: str(d.landmark),
    pickup_point: str(d.pickupPoint),
    delivery_notes: str(d.notes),
    address_line1: str(d.line1),
    address_city: str(d.city),
    address_state: str(d.state),
    address_postcode: str(d.postcode),
    address_country: str(d.country),

    company_name: str(b.companyName),
    kra_pin: str(b.kraPin)?.toUpperCase() ?? null,
    po_reference: str(b.poReference),
    terms_accepted_at: body.termsAccepted ? new Date().toISOString() : null,
  });

  if (insertError) {
    return NextResponse.json({ error: "Could not create the order" }, { status: 500 });
  }

  // Redeem after the order exists, so the ledger entry has an order number to
  // point at and a refund can find it.
  let giftMinor = 0;
  let giftCode: string | null = null;
  if (body.giftCardCode) {
    try {
      const result = await redeemGiftCard(String(body.giftCardCode), dueMinor, orderNumber);
      giftMinor = result.appliedMinor;
      giftCode = String(body.giftCardCode).trim().toUpperCase();
      await supabaseServer
        .from("orders")
        .update({ gift_card_minor: giftMinor, gift_card_code: giftCode })
        .eq("order_number", orderNumber);
    } catch (err: any) {
      // A bad card must not silently become a full-price charge.
      await supabaseServer.from("orders").delete().eq("order_number", orderNumber);
      const status = err instanceof GiftCardError ? err.status : 500;
      return NextResponse.json({ error: err.message ?? "Gift card failed" }, { status });
    }
  }

  const remainingMinor = Math.max(0, dueMinor - giftMinor);

  // Credit covered the whole order: nothing to charge, so settle it here rather
  // than sending someone to a payment page for KSh 0.
  if (remainingMinor === 0) {
    await settleOrder(orderNumber, { channel: "gift_card", receipt: giftCode });
    return NextResponse.json({
      orderNumber,
      paidWithCredit: true,
      giftCardMinor: giftMinor,
      redirectTo: `/order/${orderNumber}`,
    });
  }

  const origin = new URL(req.url).origin;

  try {
    const { authorizationUrl } = await initializeTransaction({
      email,
      phone,
      amountMinor: remainingMinor,
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
      giftCardMinor: giftMinor,
      dueMinor: remainingMinor,
    });
  } catch (err: any) {
    await supabaseServer
      .from("orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("order_number", orderNumber);
    return NextResponse.json({ error: err?.message ?? "Payment setup failed" }, { status: 502 });
  }
}
