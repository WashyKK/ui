
/**
 * Shapes and vocabulary for the four collections hanging off a product: images, documents, links and code
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

/** http(s) only. Blocks javascript: and data: URLs from reaching a rendered href. */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
