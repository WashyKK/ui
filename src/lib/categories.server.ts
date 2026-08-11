import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildTree, type CategoryNode } from "@/lib/categories";

/**
 * The category tree, flattened in display order with depth.
 *
 * Reads the `category_tree` view when it exists and falls back to building the
 * tree in JS from a flat select, so a database without category_tree.sql still
 * renders — just with every category at depth 0, which is exactly what it was
 * before the migration.
 */
export async function loadCategoryTree(): Promise<CategoryNode[]> {
  const view = await supabaseServer
    .from("category_tree")
    .select("*")
    .order("path");

  if (!view.error && view.data) {
    return view.data.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      parentId: row.parent_id ?? null,
      slug: row.slug ?? null,
      position: row.position ?? 0,
      depth: row.depth ?? 0,
      path: row.path ?? row.name,
    }));
  }

  const flat = await supabaseServer.from("categories").select("*").order("name");
  if (flat.error || !flat.data) return [];

  return buildTree(
    flat.data.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      parentId: row.parent_id ?? null,
      slug: row.slug ?? null,
      position: row.position ?? 0,
      depth: 0,
      path: row.name,
    }))
  );
}
