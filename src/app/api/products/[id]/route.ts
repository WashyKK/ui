import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const isAdmin = cookies().get("admin")?.value === "1";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const update: any = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.price === "number") update.price = body.price;
  if (typeof body.stock === "number") update.stock = body.stock;
  if (typeof body.category === "string") update.category = body.category;
  if (typeof body.imageUrl === "string") update.image_url = body.imageUrl;

  const { data, error } = await supabaseServer
    .from("products")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const isAdmin = cookies().get("admin")?.value === "1";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseServer
    .from("products")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

