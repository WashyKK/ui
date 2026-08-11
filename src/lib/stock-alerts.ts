import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendBackInStock } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { productPath } from "@/lib/slug";

/**
 * Notify everyone waiting on a part that has come back into stock.
 *
 * Called after a stock edit rather than on a schedule, so the email goes out
 * within seconds of the shelf being restocked — which matters when several
 * people are waiting on the same scarce part and the first to order gets it.
 *
 * Rows are marked notified before the sends go out. A duplicate email is
 * annoying; a second notification wave because a crash lost the marker is worse,
 * and this runs inside a request that must not hang.
 */
export async function notifyBackInStock(productId: string): Promise<number> {
  const { data: product } = await supabaseServer
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product || Number(product.stock) <= 0) return 0;

  const { data: pending } = await supabaseServer
    .from("stock_alerts")
    .select("id, email")
    .eq("product_id", productId)
    .is("notified_at", null);

  if (!pending?.length) return 0;

  await supabaseServer
    .from("stock_alerts")
    .update({ notified_at: new Date().toISOString() })
    .in("id", pending.map((row) => row.id));

  const url = absoluteUrl(productPath({ id: product.id, slug: product.slug }));

  await Promise.allSettled(
    pending.map((row) =>
      sendBackInStock({
        to: row.email,
        productName: product.name,
        productUrl: url,
        stock: Number(product.stock),
      })
    )
  );

  return pending.length;
}
