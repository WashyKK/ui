import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = (await cookies()).get("admin")?.value === "1";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("categories")
    .update({ name: body.name.trim(), description: body.description?.trim() || null })
    .eq("id", (await params).id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = (await cookies()).get("admin")?.value === "1";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseServer
    .from("categories")
    .delete()
    .eq("id", (await params).id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
