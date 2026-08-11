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

  const { id } = await params;

  const update: Record<string, unknown> = {
    name: body.name.trim(),
    description: body.description?.trim() || null,
  };
  if (body.parentId !== undefined) {
    // "" or null means "make this a top-level category".
    update.parent_id = body.parentId || null;
  }

  const { data, error } = await supabaseServer
    .from("categories")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    // The cycle trigger raises a plain exception; surface its text, which is
    // already written for a human ("That would put DC inside its own subtree").
    if (/subtree|own parent|cyclic|too deep/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A category with that name already exists in the same place." },
        { status: 409 }
      );
    }
    if (/parent_id/i.test(error.message)) {
      return NextResponse.json(
        { error: "Sub-categories need supabase/category_tree.sql applied first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = (await cookies()).get("admin")?.value === "1";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseServer.from("categories").delete().eq("id", id);

  if (error) {
    // parent_id is ON DELETE RESTRICT: deleting a parent would orphan a subtree,
    // so say what to do instead of leaking a foreign-key error.
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "This category has sub-categories. Move or delete those first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
