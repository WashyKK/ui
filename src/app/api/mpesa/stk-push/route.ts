import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { stkPush, normalizePhone, isValidKenyanPhone } from "@/lib/mpesa";

const USD_TO_KES = Number(process.env.MPESA_USD_TO_KES_RATE ?? "130");

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone);
  if (!isValidKenyanPhone(phone)) {
    return NextResponse.json(
      { error: "Enter a valid Kenyan mobile number (e.g. 0712 345 678)" },
      { status: 400 }
    );
  }

  // Accept { items: [{productId, quantity}] } or legacy { productId, quantity }
  const rawItems: { productId: string; quantity: number }[] =
    Array.isArray(body.items)
      ? body.items
      : body.productId
      ? [{ productId: body.productId, quantity: body.quantity ?? 1 }]
      : [];

  if (!rawItems.length) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  // Validate and price all items server-side
  let totalUSD = 0;
  const resolvedItems: { id: string; name: string; price: number; quantity: number }[] = [];

  for (const item of rawItems) {
    const { data: p, error } = await supabaseServer
      .from("products")
      .select("id, name, price, stock")
      .eq("id", item.productId)
      .single();

    if (error || !p) {
      return NextResponse.json(
        { error: `Product not found: ${item.productId}` },
        { status: 404 }
      );
    }
    if (Number(p.stock) < item.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for "${p.name}"` },
        { status: 400 }
      );
    }

    totalUSD += Number(p.price) * item.quantity;
    resolvedItems.push({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      quantity: item.quantity,
    });
  }

  const amountKES = Math.ceil(totalUSD * USD_TO_KES);
  if (amountKES < 1) {
    return NextResponse.json({ error: "Order amount too low" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const description =
    resolvedItems.length === 1
      ? resolvedItems[0].name.slice(0, 13)
      : "Elffie Order";

  let result;
  try {
    result = await stkPush({
      phone,
      amount: amountKES,
      accountRef: "ElffieStore",
      description,
      callbackUrl: `${origin}/api/mpesa/callback`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  // Record pending order
  await supabaseServer.from("mpesa_orders").insert({
    checkout_request_id: result.CheckoutRequestID,
    merchant_request_id: result.MerchantRequestID,
    product_id: resolvedItems.length === 1 ? resolvedItems[0].id : null,
    quantity: resolvedItems.reduce((s, i) => s + i.quantity, 0),
    amount: amountKES,
    phone,
    cart_items: resolvedItems.length > 1 ? resolvedItems : null,
    status: "pending",
  });

  return NextResponse.json({
    checkoutRequestId: result.CheckoutRequestID,
    customerMessage: result.CustomerMessage,
    amountKES,
  });
}
