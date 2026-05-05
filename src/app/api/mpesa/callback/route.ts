import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

  const meta: Record<string, any> = {};
  for (const item of CallbackMetadata?.Item ?? []) {
    meta[item.Name] = item.Value;
  }

  const status = resultCode === 0 ? "completed" : "failed";

  const { data: order } = await supabaseServer
    .from("mpesa_orders")
    .update({
      status,
      result_code: String(resultCode),
      result_desc: resultDesc,
      mpesa_receipt: meta.MpesaReceiptNumber ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", checkoutRequestId)
    .select("product_id, quantity, cart_items")
    .single();

  // Decrement stock on success
  if (status === "completed" && order) {
    const itemsToDecrement: { id: string; quantity: number }[] = order.cart_items
      ? (order.cart_items as any[]).map((i) => ({ id: i.id, quantity: i.quantity }))
      : order.product_id
      ? [{ id: order.product_id, quantity: order.quantity }]
      : [];

    for (const item of itemsToDecrement) {
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
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
