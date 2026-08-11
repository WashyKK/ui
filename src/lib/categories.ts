/**
 * Category shapes and pure tree helpers.
 *
 * Deliberately free of any database import: client components use these, and a
 * server import here would drag the service-role Supabase client into the
 * browser bundle. The reads live in categories.server.ts.
 */

export interface CategoryNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  slug: string | null;
  position: number;
  depth: number;
  /** "Motors › DC › Stepper" */
  path: string;
  productCount?: number;
}

/** Order a flat list into depth-first display order, computing depth and path. */
export function buildTree(rows: CategoryNode[]): CategoryNode[] {
  const byParent = new Map<string | null, CategoryNode[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }

  const out: CategoryNode[] = [];
  const seen = new Set<string>();

  const walk = (parentId: string | null, depth: number, prefix: string) => {
    const children = (byParent.get(parentId) ?? []).sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name)
    );
    for (const child of children) {
      // A cycle should be impossible — the database trigger forbids it — but a
      // fallback path that hangs the admin is a worse failure than a missing row.
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const path = prefix ? `${prefix} › ${child.name}` : child.name;
      out.push({ ...child, depth, path });
      walk(child.id, depth + 1, path);
    }
  };

  walk(null, 0, "");

  // Anything orphaned by a missing parent still belongs in the list.
  for (const row of rows) {
    if (!seen.has(row.id)) out.push({ ...row, depth: 0, path: row.name });
  }

  return out;
}

/** A category and everything beneath it — what "filter by Motors" must match. */
export function descendantIds(tree: CategoryNode[], rootId: string): string[] {
  const children = new Map<string | null, string[]>();
  for (const node of tree) {
    const key = node.parentId ?? null;
    children.set(key, [...(children.get(key) ?? []), node.id]);
  }

  const out: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** Names of a category and its descendants, for matching the legacy text column. */
export function descendantNames(tree: CategoryNode[], rootId: string): string[] {
  const ids = new Set(descendantIds(tree, rootId));
  return tree.filter((n) => ids.has(n.id)).map((n) => n.name);
}

/** Ancestors of a node, root first — the breadcrumb trail. */
export function ancestorsOf(tree: CategoryNode[], id: string): CategoryNode[] {
  const byId = new Map(tree.map((n) => [n.id, n]));
  const trail: CategoryNode[] = [];
  let cursor = byId.get(id)?.parentId ?? null;
  let hops = 0;
  while (cursor && hops++ < 50) {
    const node = byId.get(cursor);
    if (!node) break;
    trail.unshift(node);
    cursor = node.parentId;
  }
  return trail;
}
