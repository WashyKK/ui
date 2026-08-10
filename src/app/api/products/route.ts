import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { canManageProducts } from "@/lib/auth-check";
import { listProducts } from "@/lib/products-query";

export async function GET() {
  const { data, error } = await listProducts();

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
  }).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}

