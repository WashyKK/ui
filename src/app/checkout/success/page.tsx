import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

async function recordOrder(sessionId: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return;

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return;
  }

  if (session.payment_status !== "paid") return;

  const meta = session.metadata ?? {};
  const email = meta.customer_email || session.customer_details?.email || null;
  const shippingZone = meta.shipping_zone || null;
  const shippingAmount = Number(meta.shipping_amount || 0) || null;

  let cartItems: { productId: string; quantity: number }[] = [];
  try { cartItems = meta.items ? JSON.parse(meta.items) : []; } catch {}
  if (!cartItems.length && meta.productId) {
    cartItems = [{ productId: meta.productId, quantity: parseInt(meta.quantity || "1", 10) }];
  }

  await supabaseServer.from("orders").upsert({
    stripe_session_id: session.id,
    product_id: cartItems.length === 1 ? cartItems[0].productId : null,
    quantity: cartItems.reduce((s, i) => s + i.quantity, 0),
    amount_total: session.amount_total ?? 0,
    customer_email: email,
    shipping_zone: shippingZone,
    shipping_amount: shippingAmount,
    cart_items: cartItems.length > 0 ? cartItems : null,
  }, { onConflict: "stripe_session_id" });
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  if (sessionId) await recordOrder(sessionId);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm p-10 text-center space-y-5">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-50 dark:bg-green-950/40 p-4 border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Order Confirmed</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you for your purchase. A confirmation email has been sent to you.
            Our team will be in touch with shipping details shortly.
          </p>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/store"
            className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition"
          >
            View Order History
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Questions? Email{" "}
          <a
            href="mailto:washingtonkigan@gmail.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            washingtonkigan@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
