import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";
import { listProducts } from "@/lib/products-query";
import { saveProductResources } from "@/lib/product-resources.server";
import { PRODUCT_STATUSES } from "@/lib/product-status";

export async function GET(req: Request) {
  // The admin grid needs unlisted and archived rows; the storefront must not
  // see them. Gated on the same cookie that guards every other admin read.
  const wantsAll = new URL(req.url).searchParams.get("all") === "1";
  const includeHidden = wantsAll && (await canManageProducts());

  const { data, error } = await listProducts({ includeHidden });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ products: data });
}

export async function POST(req: Request) {
  if (!(await canManageProducts())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.name || typeof body.price !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await supabaseServer.from("products").insert({
    name: body.name,
    description: body.description ?? null,
    price: body.price,
    stock: body.stock ?? 0,
    category: body.category ?? null,
    category_id: body.categoryId ?? null,
    sku: body.sku?.trim() || null,
    mpn: body.mpn?.trim() || null,
    manufacturer: body.manufacturer?.trim() || null,
    image_url: body.imageUrl ?? null,
    datasheet_url: body.datasheetUrl ?? null,
    status: PRODUCT_STATUSES.includes(body.status) ? body.status : "active",
  }).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Images, documents, links and snippets need the product id, so they land
  // after the insert. A failure here is logged, not fatal — the product exists.
  const resources = await saveProductResources(data.id, body);

  return NextResponse.json({ product: data, resources }, { status: 201 });
}

