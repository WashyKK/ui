import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Facet, ProductAttribute } from "@/lib/attributes";

/**
 * Spec values for one product, ordered by the vocabulary's own position so every
 * product's table reads in the same order — voltage before certification, not
 * whatever order someone happened to type them in.
 *
 * Returns [] when the tables are not there yet; a missing migration should cost
 * the spec table, not the whole page.
 */
export async function attributesFor(productId: string): Promise<ProductAttribute[]> {
  const { data, error } = await supabaseServer
    .from("product_attributes")
    .select("value, attribute_keys(key, label, unit, position)")
    .eq("product_id", productId);

  if (error || !data) return [];

  return data
    .map((row: any) => {
      const key = Array.isArray(row.attribute_keys) ? row.attribute_keys[0] : row.attribute_keys;
      if (!key) return null;
      return {
        key: key.key,
        label: key.label,
        unit: key.unit,
        value: row.value,
        position: key.position ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.position - b.position) as ProductAttribute[];
}

/**
 * Every facetable key with its distinct values and how many products carry each.
 *
 * Counts matter: a facet value matching one product out of four is noise, and
 * showing "IP67 (1)" lets someone decide that for themselves.
 */
export async function facets(): Promise<Facet[]> {
  const { data, error } = await supabaseServer
    .from("product_attributes")
    .select("value, attribute_keys!inner(key, label, unit, position, facetable)");

  if (error || !data) return [];

  const grouped = new Map<string, Facet & { position: number }>();

  for (const row of data as any[]) {
    const key = Array.isArray(row.attribute_keys) ? row.attribute_keys[0] : row.attribute_keys;
    if (!key?.facetable) continue;

    let facet = grouped.get(key.key);
    if (!facet) {
      facet = {
        key: key.key,
        label: key.label,
        unit: key.unit,
        position: key.position ?? 0,
        values: [],
      };
      grouped.set(key.key, facet);
    }

    const existing = facet.values.find((v) => v.value === row.value);
    if (existing) existing.count += 1;
    else facet.values.push({ value: row.value, count: 1 });
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.position - b.position)
    .map(({ position, ...facet }) => ({
      ...facet,
      values: facet.values.sort(
        (a, b) => b.count - a.count || a.value.localeCompare(b.value, undefined, { numeric: true })
      ),
    }));
}

/** productId -> { key -> [values] }, for client-side filtering. */
export async function attributeIndex(): Promise<Record<string, Record<string, string[]>>> {
  const { data, error } = await supabaseServer
    .from("product_attributes")
    .select("product_id, value, attribute_keys!inner(key, facetable)");

  if (error || !data) return {};

  const index: Record<string, Record<string, string[]>> = {};
  for (const row of data as any[]) {
    const key = Array.isArray(row.attribute_keys) ? row.attribute_keys[0] : row.attribute_keys;
    if (!key?.facetable) continue;
    index[row.product_id] ??= {};
    index[row.product_id][key.key] ??= [];
    index[row.product_id][key.key].push(row.value);
  }
  return index;
}
