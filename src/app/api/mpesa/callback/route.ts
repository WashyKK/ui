import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendOrderConfirmation } from "@/lib/email";
import { decrementStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

// Safaricom sends no signature, so this endpoint authenticates two ways: a shared
// secret carried in the callback URL we registered, and the requirement that the
// order still be pending. Without both, anyone could POST a synthetic success and
// mark an order paid.
export async function POST(req: Request) {
  const expectedSecret = process.env.MPESA_CALLBACK_SECRET;
  if (expectedSecret) {
    const provided = new URL(req.url).searchParams.get("k");
    if (provided !== expectedSecret) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  const cb = body?.Body?.stkCallback;
  if (!cb) return NextResponse.json({ ok: true });

  const {
    CheckoutRequestID: checkoutRequestId,
    ResultCode: resultCode,
    ResultDesc: resultDesc,
    CallbackMetadata,
  } = cb;

  if (!checkoutRequestId) return NextResponse.json({ ok: true });

  const mpesaMeta: Record<string, any> = {};
  for (const item of CallbackMetadata?.Item ?? []) {
    mpesaMeta[item.Name] = item.Value;
  }

  const status = resultCode === 0 ? "completed" : "failed";

  // Matching on status = 'pending' makes this idempotent and rejects both unknown
  // ids and replays of an already-settled order: no pending row, no update, no
  // stock decrement, no email.
  const { data: order } = await supabaseServer
    .from("mpesa_orders")
    .update({
      status,
      result_code: String(resultCode),
      result_desc: resultDesc,
      mpesa_receipt: mpesaMeta.MpesaReceiptNumber ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", checkoutRequestId)
    .eq("status", "pending")
    .select("product_id, quantity, cart_items, email, shipping_zone, shipping_amount, amount")
    .maybeSingle();

  if (status === "completed" && order) {
    // Resolve items for stock decrement and email
    const itemsToProcess: { id: string; quantity: number }[] = order.cart_items
      ? (order.cart_items as any[]).map((i) => ({ id: i.id, quantity: i.quantity }))
      : order.product_id
      ? [{ id: order.product_id, quantity: order.quantity }]
      : [];

    // Decrement stock
    await decrementStock(itemsToProcess);

    // Send order confirmation email
    if (order.email && itemsToProcess.length) {
      const USD_TO_KES = Number(process.env.MPESA_USD_TO_KES_RATE ?? 130);
      const resolvedItems = await Promise.all(
        itemsToProcess.map(async (item) => {
          const { data: p } = await supabaseServer
            .from("products")
            .select("name, price")
            .eq("id", item.id)
            .single();
          return { name: p?.name ?? "Product", quantity: item.quantity, price: Number(p?.price ?? 0) };
        })
      );
      const shippingUSD = Number(order.shipping_amount ?? 0);
      const subtotalUSD = resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0);
      await sendOrderConfirmation({
        to: order.email,
        orderRef: (mpesaMeta.MpesaReceiptNumber || checkoutRequestId.slice(-8)).toUpperCase(),
        items: resolvedItems,
        subtotalUSD,
        shippingUSD,
        shippingZone: order.shipping_zone || "",
        paymentMethod: "mpesa",
        mpesaReceipt: mpesaMeta.MpesaReceiptNumber,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
