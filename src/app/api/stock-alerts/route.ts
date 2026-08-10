import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * "Tell me when this is back."
 *
 * Public write, so it is narrow: an email and a product id, nothing else, and
 * duplicates are absorbed rather than rejected — someone tapping twice should
 * not see an error.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const productId = String(body?.productId ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);

  if (!productId) {
    return NextResponse.json({ error: "Which product?" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const { data: product } = await supabaseServer
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (Number(product.stock) > 0) {
    return NextResponse.json({ error: "This is in stock now — you can order it." }, { status: 409 });
  }

  const { error } = await supabaseServer
    .from("stock_alerts")
    .insert({ product_id: productId, email });

  // 23505 = already subscribed. That is the outcome they wanted anyway.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Could not save your request" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
