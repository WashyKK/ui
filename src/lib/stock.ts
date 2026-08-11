import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Decrement stock for a set of purchased items.
 *
 * Uses the `decrement_stock` Postgres function so the read and the write happen
 * in one statement — two payments landing at the same moment used to read the
 * same stock value and both write back the same decrement, losing one.
 *
 * Apply supabase/decrement_stock.sql before deploying. Until it exists the
 * fallback below keeps orders flowing on the old read-then-write path; delete
 * the fallback once the function is live.
 */
export async function decrementStock(items: { id: string; quantity: number }[]) {
  for (const item of items) {
    const { error } = await supabaseServer.rpc("decrement_stock", {
      p_product_id: item.id,
      p_quantity: item.quantity,
    });
    if (!error) continue;

    // PGRST202 = function not found in the schema cache (migration not applied yet)
    if (error.code !== "PGRST202") {
      console.error(`decrement_stock failed for ${item.id}:`, error.message);
      continue;
    }

    const { data: product } = await supabaseServer
      .from("products")
      .select("stock")
      .eq("id", item.id)
      .single();
    if (product) {
      await supabaseServer
        .from("products")
        .update({ stock: Math.max(0, Number(product.stock) - item.quantity) })
        .eq("id", item.id);
    }
  }
}
