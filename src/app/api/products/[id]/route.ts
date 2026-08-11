import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";
import { notifyBackInStock } from "@/lib/stock-alerts";
import { loadProductResources, saveProductResources } from "@/lib/product-resources.server";
import { PRODUCT_STATUSES } from "@/lib/product-status";
import { findProductBy } from "@/lib/products-query";

/** One product with its four collections — what the admin sheet needs to edit. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageProducts())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await findProductBy("id", id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resources = await loadProductResources(id);
  return NextResponse.json({ product, ...resources });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageProducts())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const update: any = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.price === "number") update.price = body.price;
  if (typeof body.stock === "number") update.stock = body.stock;
  if (typeof body.category === "string") update.category = body.category;
  if (body.categoryId !== undefined) update.category_id = body.categoryId || null;
  if (body.status !== undefined && PRODUCT_STATUSES.includes(body.status)) {
    update.status = body.status;
  }
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
    .eq("id", productId)
    .maybeSingle();

  const { data, error } = await supabaseServer
    .from("products")
    .update(update)
    .eq("id", productId)
    .select("*")
    .single();

  if (error) {
    // The status column arrives with product_status.sql; name the migration
    // rather than leaking "schema cache" at someone clicking Unlist.
    if (/'status' column|status.*schema cache/i.test(error.message)) {
      return NextResponse.json(
        { error: "Listing status needs supabase/product_status.sql applied first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resources = await saveProductResources(productId, body);

  let notified = 0;
  const wasOutOfStock = Number(before?.stock ?? 0) <= 0;
  if (wasOutOfStock && Number(data.stock) > 0) {
    // Never let a notification failure fail the edit — the stock change is the
    // thing that had to succeed.
    notified = await notifyBackInStock(productId).catch((err) => {
      console.error("back-in-stock notification failed:", err?.message);
      return 0;
    });
  }

  return NextResponse.json({ product: data, notified, resources });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageProducts())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseServer.from("products").delete().eq("id", id);

  if (!error) return NextResponse.json({ ok: true, deleted: true });

  // 23503: an order references this product. That constraint is deliberate —
  // an order records what somebody actually bought, and a catalogue edit must
  // not be able to rewrite it. Say so, and point at the thing they can do.
  if (error.code === "23503") {
    const [{ count: orderCount }, { count: mpesaCount }] = await Promise.all([
      supabaseServer.from("orders").select("id", { count: "exact", head: true }).eq("product_id", id),
      supabaseServer.from("mpesa_orders").select("id", { count: "exact", head: true }).eq("product_id", id),
    ]);
    const total = (orderCount ?? 0) + (mpesaCount ?? 0);

    return NextResponse.json(
      {
        error:
          `This product appears on ${total || "past"} order${total === 1 ? "" : "s"}, so deleting it ` +
          `would break that history. Archive it instead — it disappears from the store ` +
          `but the orders keep their record.`,
        canArchive: true,
        orderCount: total,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ error: error.message }, { status: 500 });
}
