import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Read products with their gallery, tolerating a database that has not had
 * supabase/catalog_depth.sql applied yet.
 *
 * Without this, deploying the code before running the migration takes the
 * catalogue down completely: PostgREST rejects the whole query with "Could not
 * find a relationship between 'products' and 'product_images'" and every
 * product page, the store and the sitemap return nothing. Schema and code do
 * not deploy at the same instant, so the code has to survive the gap.
 *
 * Delete the fallback once the migration is applied everywhere.
 */
const WITH_IMAGES = "*, product_images(url, alt, position)";

function isMissingSchema(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    /relationship/i.test(message) ||
    /product_images/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    error.code === "PGRST200" ||
    error.code === "42703"
  );
}

export async function listProducts() {
  const withImages = await supabaseServer
    .from("products")
    .select(WITH_IMAGES)
    .order("created_at", { ascending: false });

  if (!withImages.error) return { data: withImages.data ?? [], error: null };
  if (!isMissingSchema(withImages.error)) {
    return { data: [], error: withImages.error };
  }

  const plain = await supabaseServer
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: plain.data ?? [], error: plain.error };
}

export async function findProductBy(column: "id" | "slug", value: string) {
  const withImages = await supabaseServer
    .from("products")
    .select(WITH_IMAGES)
    .eq(column, value)
    .maybeSingle();

  if (!withImages.error) return withImages.data;
  if (!isMissingSchema(withImages.error)) return null;

  // `slug` may not exist yet either, in which case there is nothing to match.
  if (column === "slug") return null;

  const plain = await supabaseServer
    .from("products")
    .select("*")
    .eq(column, value)
    .maybeSingle();

  return plain.data;
}
