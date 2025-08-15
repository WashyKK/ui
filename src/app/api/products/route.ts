import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("products")
    .select("id, name, description, price, stock, category, image_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  // Simple admin gate via cookie set by /api/admin/login
  const isAdmin = cookies().get("admin")?.value === "1";
  if (!isAdmin) {
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
    image_url: body.imageUrl ?? null,
  }).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}

