import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getVerifiedUser } from "@/lib/session";
import { settleOrder } from "@/lib/orders";
import { isPaystackConfigured, verifyTransaction } from "@/lib/paystack";
import { getShippingLabel } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/**
 * Look up one order.
 *
 * Most buyers here check out as guests, so requiring an account to see your own
 * order would be the wrong trade. Instead the order number and the email on the
 * order must both match — knowing one is not enough.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderNumber = String(body?.orderNumber ?? "").trim().toUpperCase();
  const claimedEmail = String(body?.email ?? "").trim().toLowerCase();

  if (!orderNumber) {
    return NextResponse.json({ error: "An order number is required" }, { status: 400 });
  }

  // A signed-in customer never has to prove their address again.
  const user = await getVerifiedUser(req);
  const email = user?.email ?? claimedEmail;
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // select("*") rather than a column list: the list is long enough that
  // concatenating it defeats the client's type inference, and this is one row.
  const { data: order } = await supabaseServer
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  // Same response whether the order does not exist or the email does not match,
  // so this cannot be used to test which order numbers are real.
  if (!order || (order.customer_email ?? "").toLowerCase() !== email) {
    return NextResponse.json({ error: "No order found with that number and email" }, { status: 404 });
  }

  let status = order.status;

  // Webhooks can be late or lost. If the buyer is back from Paystack and we
  // still think this is unpaid, ask Paystack directly rather than showing them
  // a pending order they know they have paid for.
  if (status === "pending" && order.provider === "paystack" && isPaystackConfigured()) {
    try {
      const tx = await verifyTransaction(order.provider_ref ?? orderNumber);
      if (tx.status === "success") {
        const { settled } = await settleOrder(orderNumber, {
          channel: tx.channel,
          receipt: tx.receipt,
        });
        if (settled) status = "paid";
      }
    } catch {
      // Leave it pending; the webhook is still the primary path.
    }
  }

  const { data: events } = await supabaseServer
    .from("order_events")
    .select("event, from_status, to_status, note, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    order: {
      orderNumber: order.order_number,
      status,
      items: order.items ?? [],
      subtotalUsd: Number(order.subtotal_usd ?? 0),
      shippingUsd: Number(order.shipping_usd ?? 0),
      totalKes: order.amount_minor ? Number(order.amount_minor) / 100 : null,
      currency: order.currency,
      shippingZone: order.shipping_zone,
      shippingLabel: order.shipping_zone ? getShippingLabel(order.shipping_zone) : null,
      recipientName: order.recipient_name,
      deliveryTown: order.delivery_town,
      deliveryCounty: order.delivery_county,
      deliveryLandmark: order.delivery_landmark,
      pickupPoint: order.pickup_point,
      addressLine1: order.address_line1,
      addressCity: order.address_city,
      addressCountry: order.address_country,
      companyName: order.company_name,
      poReference: order.po_reference,
      trackingNumber: order.tracking_number,
      carrier: order.carrier,
      paymentChannel: order.payment_channel,
      paymentReceipt: order.payment_receipt,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      createdAt: order.created_at,
    },
    events: events ?? [],
  });
}
