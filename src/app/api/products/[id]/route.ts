import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";
import { notifyBackInStock } from "@/lib/stock-alerts";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!canManageProducts()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const update: any = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.price === "number") update.price = body.price;
  if (typeof body.stock === "number") update.stock = body.stock;
  if (typeof body.category === "string") update.category = body.category;
  if (body.categoryId !== undefined) update.category_id = body.categoryId || null;
  if (body.sku !== undefined) update.sku = String(body.sku).trim() || null;
  if (body.mpn !== undefined) update.mpn = String(body.mpn).trim() || null;
  if (body.manufacturer !== undefined) {
    update.manufacturer = String(body.manufacturer).trim() || null;
  }
  if (typeof body.imageUrl === "string") update.image_url = body.imageUrl;
  if (typeof body.datasheetUrl === "string") update.datasheet_url = body.datasheetUrl;

  // Read the old stock first: going from zero to positive is what everyone
  // waiting on this part asked to be told about.
  const { data: before } = await supabaseServer
    .from("products")
    .select("stock")
    .eq("id", params.id)
    .maybeSingle();

  const { data, error } = await supabaseServer
    .from("products")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  const wasOutOfStock = Number(before?.stock ?? 0) <= 0;
  if (wasOutOfStock && Number(data.stock) > 0) {
    // Never let a notification failure fail the edit — the stock change is the
    // thing that had to succeed.
    notified = await notifyBackInStock(params.id).catch((err) => {
      console.error("back-in-stock notification failed:", err?.message);
      return 0;
    });
  }

  return NextResponse.json({ product: data, notified });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!canManageProducts()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseServer
    .from("products")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
