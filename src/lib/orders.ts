import "server-only";
import { supabaseServer } from "@/lib/supabaseServer";
import { getShippingRate } from "@/lib/shipping";
import { getUsdToKesRate, usdToKes } from "@/lib/fx";
import { decrementStock } from "@/lib/stock";
import { sendOrderConfirmation } from "@/lib/email";

/**
 * A purchased line, snapshotted at checkout. Name and unit price are copied in
 * rather than joined at read time, so editing a product's price or name later
 * never rewrites what an old order says the customer bought.
 */
export interface OrderItem {
  productId: string;
  name: string;
  unitPriceUsd: number;
  quantity: number;
}

export interface PricedCart {
  items: OrderItem[];
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  fxRate: number;
  totalKes: number;
}

/** Crockford-ish: no O/0/I/1, so an order number read aloud is unambiguous. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomOrderNumber(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `ELF-${out}`;
}

/**
 * An order number nobody is already using. The unique index is the real
 * guarantee; this just avoids losing an insert to a collision.
 */
export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomOrderNumber();
    const { data } = await supabaseServer
      .from("orders")
      .select("id")
      .eq("order_number", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // 30^6 is ~729M; five collisions means something is wrong, so stop guessing.
  throw new Error("Could not allocate an unused order number");
}

export class CartPricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Price a cart from the database, never from the client.
 *
 * The browser sends product ids and quantities; everything that determines what
 * someone is charged — unit price, availability, shipping — is read server-side.
 */
export async function priceCart(
  rawItems: { productId?: string; id?: string; quantity?: number | string }[],
  shippingZone: string
): Promise<PricedCart> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new CartPricingError("No items provided");
  }
  if (rawItems.length > 50) {
    throw new CartPricingError("Too many line items");
  }

  const items: OrderItem[] = [];
  let subtotalUsd = 0;

  for (const raw of rawItems) {
    const productId = raw.productId ?? raw.id;
    const quantity = Math.max(1, Math.floor(Number(raw.quantity ?? 1)));
    if (!productId) throw new CartPricingError("Line item is missing a product id");
    if (!Number.isFinite(quantity)) throw new CartPricingError("Invalid quantity");

    const { data: product, error } = await supabaseServer
      .from("products")
      .select("id, name, price, stock")
      .eq("id", productId)
      .single();

    if (error || !product) {
      throw new CartPricingError(`Product not found: ${productId}`, 404);
    }
    if (Number(product.stock) < quantity) {
      throw new CartPricingError(`Insufficient stock for "${product.name}"`);
    }

    const unitPriceUsd = Number(product.price);
    subtotalUsd += unitPriceUsd * quantity;
    items.push({ productId: product.id, name: product.name, unitPriceUsd, quantity });
  }

  const shippingUsd = shippingZone ? getShippingRate(shippingZone) : 0;
  const totalUsd = subtotalUsd + shippingUsd;
  const fxRate = getUsdToKesRate();
  const totalKes = usdToKes(totalUsd, fxRate);

  if (totalKes < 1) throw new CartPricingError("Order amount too low");

  return { items, subtotalUsd, shippingUsd, totalUsd, fxRate, totalKes };
}

/** Line items in the shape sendOrderConfirmation expects. */
export function toEmailItems(items: OrderItem[]) {
  return items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.unitPriceUsd }));
}

/**
 * Move a pending order to paid, exactly once.
 *
 * Both the webhook and the customer's return from the payment page call this,
 * and Paystack retries webhooks until it gets a 200, so this runs more than once
 * for a healthy order. Gating the UPDATE on status = 'pending' means the second
 * and later calls match no row and do nothing — no double stock decrement, no
 * duplicate confirmation email.
 */
export async function settleOrder(
  orderNumber: string,
  details: { receipt?: string | null; channel?: string | null } = {}
): Promise<{ settled: boolean }> {
  const { data: order } = await supabaseServer
    .from("orders")
    .update({
      status: "paid",
      payment_channel: details.channel ?? null,
      payment_receipt: details.receipt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("order_number", orderNumber)
    .eq("status", "pending")
    .select("order_number, items, customer_email, shipping_zone, shipping_usd, subtotal_usd")
    .maybeSingle();

  if (!order) return { settled: false };

  const items = (order.items ?? []) as OrderItem[];
  await decrementStock(items.map((i) => ({ id: i.productId, quantity: i.quantity })));

  if (order.customer_email && items.length) {
    await sendOrderConfirmation({
      to: order.customer_email,
      orderRef: order.order_number,
      items: toEmailItems(items),
      subtotalUsd: Number(order.subtotal_usd ?? 0),
      shippingUsd: Number(order.shipping_usd ?? 0),
      shippingZone: order.shipping_zone ?? "",
      paymentMethod: "paystack",
      receipt: details.receipt ?? undefined,
    }).catch((err) => {
      // The money is already taken; a failed email must not fail the webhook and
      // trigger a retry that re-runs everything upstream of it.
      console.error(`Order ${orderNumber}: confirmation email failed —`, err?.message);
    });
  }

  return { settled: true };
}
