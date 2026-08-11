import { supabaseServer } from "@/lib/supabaseServer";

/**
 * The four collections hanging off a product: images, documents, links and code
 * snippets.
 *
 * Saving replaces a collection wholesale rather than diffing it. These are
 * short, ordered, editor-curated lists — a diff would buy nothing and would get
 * reordering subtly wrong. Replacement makes position authoritative and the
 * admin form trivially correct.
 *
 * Every write tolerates the tables not existing yet: a product save must not
 * fail because supabase/product_resources.sql has not been applied.
 */

export interface ProductImageInput { url: string; alt?: string | null }
export interface ProductDocumentInput { url: string; title: string; kind?: string }
export interface ProductLinkInput { url: string; title: string; description?: string | null }
export interface ProductSnippetInput {
  title: string;
  language?: string;
  code: string;
  description?: string | null;
}

export const DOCUMENT_KINDS = [
  { id: "datasheet", label: "Datasheet" },
  { id: "manual", label: "User manual" },
  { id: "drawing", label: "Drawing / CAD" },
  { id: "certificate", label: "Certificate" },
  { id: "application_note", label: "Application note" },
  { id: "other", label: "Other" },
] as const;

export const SNIPPET_LANGUAGES = [
  "arduino", "c", "cpp", "python", "micropython", "javascript",
  "bash", "json", "yaml", "text",
] as const;

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

async function replaceCollection(
  table: string,
  productId: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const del = await supabaseServer.from(table).delete().eq("product_id", productId);
  if (del.error && isMissingSchema(del.error)) return;

  if (rows.length === 0) return;

  const ins = await supabaseServer.from(table).insert(rows);
  if (ins.error && !isMissingSchema(ins.error)) {
    console.error(`Could not save ${table} for ${productId}:`, ins.error.message);
  }
}

const clean = (v: unknown, max = 500): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s.slice(0, max) : null;
};

/** http(s) only. Blocks javascript: and data: URLs from reaching a rendered href. */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export async function saveProductResources(
  productId: string,
  input: {
    images?: ProductImageInput[];
    documents?: ProductDocumentInput[];
    links?: ProductLinkInput[];
    snippets?: ProductSnippetInput[];
  }
): Promise<void> {
  if (Array.isArray(input.images)) {
    await replaceCollection(
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
    );
  }

  if (Array.isArray(input.documents)) {
    const allowed = new Set(DOCUMENT_KINDS.map((k) => k.id as string));
    await replaceCollection(
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
    );
  }

  if (Array.isArray(input.links)) {
    await replaceCollection(
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
    );
  }

  if (Array.isArray(input.snippets)) {
    await replaceCollection(
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
    );
  }
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
