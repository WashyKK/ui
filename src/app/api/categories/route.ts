import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { loadCategoryTree } from "@/lib/categories";

/**
 * Returns the tree in display order, each node carrying its depth and its
 * "Motors › DC › Stepper" path. Consumers that only want a flat list still get
 * one — it is the same array.
 */
export async function GET() {
  const tree = await loadCategoryTree();
  return NextResponse.json({
    categories: tree.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      parent_id: c.parentId,
      slug: c.slug,
      depth: c.depth,
      path: c.path,
      position: c.position,
    })),
  });
}

export async function POST(req: Request) {
  const isAdmin = (await cookies()).get("admin")?.value === "1";
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    name: body.name.trim(),
    description: body.description?.trim() || null,
  };
  // Only send parent_id when the column exists to receive it — a database
  // without category_tree.sql rejects the whole insert on an unknown column.
  if (body.parentId) insert.parent_id = body.parentId;

  const attempt = await supabaseServer.from("categories").insert(insert).select("*").single();

  if (attempt.error && body.parentId && /parent_id/i.test(attempt.error.message)) {
    return NextResponse.json(
      { error: "Sub-categories need supabase/category_tree.sql applied first." },
      { status: 409 }
    );
  }
  if (attempt.error) {
    // 23505 = the unique index on (parent, lower(name)).
    if (attempt.error.code === "23505") {
      return NextResponse.json(
        { error: "A category with that name already exists in the same place." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: attempt.error.message }, { status: 500 });
  }

  return NextResponse.json({ category: attempt.data }, { status: 201 });
}
