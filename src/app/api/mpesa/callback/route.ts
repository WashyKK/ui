import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendOrderConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cb = body?.Body?.stkCallback;
  if (!cb) return NextResponse.json({ ok: true });

  const {
    CheckoutRequestID: checkoutRequestId,
    ResultCode: resultCode,
    ResultDesc: resultDesc,
    CallbackMetadata,
  } = cb;

  const mpesaMeta: Record<string, any> = {};
  for (const item of CallbackMetadata?.Item ?? []) {
    mpesaMeta[item.Name] = item.Value;
  }

  const status = resultCode === 0 ? "completed" : "failed";

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
    .select("product_id, quantity, cart_items, email, shipping_zone, shipping_amount, amount")
    .single();

  if (status === "completed" && order) {
    // Resolve items for stock decrement and email
    const itemsToProcess: { id: string; quantity: number }[] = order.cart_items
      ? (order.cart_items as any[]).map((i) => ({ id: i.id, quantity: i.quantity }))
      : order.product_id
      ? [{ id: order.product_id, quantity: order.quantity }]
      : [];

    // Decrement stock
    for (const item of itemsToProcess) {
      const { data: p } = await supabaseServer
        .from("products")
        .select("stock")
        .eq("id", item.id)
        .single();
      if (p) {
        await supabaseServer
          .from("products")
          .update({ stock: Math.max(0, Number(p.stock) - item.quantity) })
          .eq("id", item.id);
      }
    }

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
