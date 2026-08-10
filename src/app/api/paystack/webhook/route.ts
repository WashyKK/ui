import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { verifyWebhookSignature } from "@/lib/paystack";
import { settleOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Paystack payment events.
 *
 * Unlike the Daraja callback this replaces, every request is signed: HMAC-SHA512
 * over the raw body, keyed by the secret key. An unsigned or mis-signed request
 * is rejected outright, so there is no forging a successful payment.
 *
 * Paystack retries until it receives a 200, so this must be idempotent and must
 * not return an error for anything that is not worth retrying.
 */
export async function POST(req: Request) {
  // Must be the exact bytes Paystack signed — parsing to JSON first and
  // re-serialising would change the whitespace and break the digest.
  const raw = await req.text();

  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const reference: string | undefined = event?.data?.reference;
  if (!reference) return NextResponse.json({ ok: true });

  switch (event.event) {
    case "charge.success": {
      await settleOrder(reference, {
        channel: event.data?.channel ?? null,
        receipt: event.data?.reference ?? null,
      });
      break;
    }

    case "charge.failed": {
      // Only a pending order may fail; never walk a paid one backwards.
      await supabaseServer
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("order_number", reference)
        .eq("status", "pending");
      break;
    }

    case "refund.processed": {
      await supabaseServer
        .from("orders")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("order_number", reference)
        .in("status", ["paid", "processing", "packed", "shipped", "delivered"]);
      break;
    }

    default:
      // Everything else is acknowledged and ignored — returning non-200 would
      // make Paystack retry an event we have no handler for, forever.
      break;
  }

  return NextResponse.json({ ok: true });
}
