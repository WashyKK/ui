import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DOCUMENT_KINDS, isSafeUrl,
  type ProductDocumentInput, type ProductImageInput,
  type ProductLinkInput, type ProductSnippetInput,
} from "@/lib/product-resources";

/** True when the failure is "this table/column is not there yet". */
function isMissingSchema(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist/i.test(error.message ?? "") ||
    /schema cache/i.test(error.message ?? "")
  );
}

/** "saved" | "skipped" (table absent) | "failed" (a real error). */
type CollectionOutcome = "saved" | "skipped" | "failed";

async function replaceCollection(
  table: string,
  productId: string,
  rows: Record<string, unknown>[]
): Promise<CollectionOutcome> {
  const del = await supabaseServer.from(table).delete().eq("product_id", productId);
  if (del.error) {
    if (isMissingSchema(del.error)) return "skipped";
    console.error(`Could not clear ${table} for ${productId}:`, del.error.message);
    return "failed";
  }

  if (rows.length === 0) return "saved";

  const ins = await supabaseServer.from(table).insert(rows);
  if (ins.error) {
    if (isMissingSchema(ins.error)) return "skipped";
    console.error(`Could not save ${table} for ${productId}:`, ins.error.message);
    return "failed";
  }
  return "saved";
}

const clean = (v: unknown, max = 500): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s.slice(0, max) : null;
};

/**
 * Save the collections, and report what actually landed.
 *
 * The report matters. These tables can be absent — product_resources.sql may
 * not have run — and swallowing that silently means an admin types out a code
 * snippet, saves, sees no error, and loses it. Which is exactly what happened.
 * The caller surfaces `skipped` so the loss is never invisible.
 */
export async function saveProductResources(
  productId: string,
  input: {
    images?: ProductImageInput[];
    documents?: ProductDocumentInput[];
    links?: ProductLinkInput[];
    snippets?: ProductSnippetInput[];
  }
): Promise<{ skipped: string[]; failed: string[] }> {
  const skipped: string[] = [];
  const failed: string[] = [];
  const note = (name: string, outcome: CollectionOutcome) => {
    if (outcome === "skipped") skipped.push(name);
    if (outcome === "failed") failed.push(name);
  };

  if (Array.isArray(input.images)) {
    note("images", await replaceCollection(
      "product_images",
      productId,
      input.images
        .filter((i) => clean(i.url) && isSafeUrl(i.url))
        .slice(0, 12)
        .map((i, position) => ({
          product_id: productId,
          url: clean(i.url, 1000),
          alt: clean(i.alt, 200),
          position,
        }))
      )
    );
  }

  if (Array.isArray(input.documents)) {
    const allowed = new Set(DOCUMENT_KINDS.map((k) => k.id as string));
    note("documents", await replaceCollection(
      "product_documents",
      productId,
      input.documents
        .filter((d) => clean(d.url) && clean(d.title) && isSafeUrl(d.url))
        .slice(0, 20)
        .map((d, position) => ({
          product_id: productId,
          url: clean(d.url, 1000),
          title: clean(d.title, 160),
          kind: allowed.has(String(d.kind)) ? d.kind : "other",
          position,
        }))
      )
    );
  }

  if (Array.isArray(input.links)) {
    note("links", await replaceCollection(
      "product_links",
      productId,
      input.links
        .filter((l) => clean(l.url) && clean(l.title) && isSafeUrl(l.url))
        .slice(0, 20)
        .map((l, position) => ({
          product_id: productId,
          url: clean(l.url, 1000),
          title: clean(l.title, 160),
          description: clean(l.description, 300),
          position,
        }))
      )
    );
  }

  if (Array.isArray(input.snippets)) {
    note("snippets", await replaceCollection(
      "product_snippets",
      productId,
      input.snippets
        .filter((s) => clean(s.title) && String(s.code ?? "").trim().length)
        .slice(0, 12)
        .map((s, position) => ({
          product_id: productId,
          title: clean(s.title, 160),
          language: clean(s.language, 40) ?? "text",
          // Not trimmed to a small cap: a wiring example is legitimately long.
          code: String(s.code).slice(0, 20000),
          description: clean(s.description, 300),
          position,
        }))
      )
    );
  }

  return { skipped, failed };
}

/** Read a product's collections. Returns empty arrays if the tables are absent. */
export async function loadProductResources(productId: string) {
  const safe = async <T,>(table: string, columns: string): Promise<T[]> => {
    const { data, error } = await supabaseServer
      .from(table)
      .select(columns)
      .eq("product_id", productId)
      .order("position");
    if (error) return [];
    return (data ?? []) as T[];
  };

  const [documents, links, snippets] = await Promise.all([
    safe<{ url: string; title: string; kind: string }>(
      "product_documents", "url, title, kind, position"
    ),
    safe<{ url: string; title: string; description: string | null }>(
      "product_links", "url, title, description, position"
    ),
    safe<{ title: string; language: string; code: string; description: string | null }>(
      "product_snippets", "title, language, code, description, position"
    ),
  ]);

  return { documents, links, snippets };
}
