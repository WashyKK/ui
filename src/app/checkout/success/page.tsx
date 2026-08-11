import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

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
    provider: "stripe",
    provider_ref: session.id,
    status: "paid",
    currency: "USD",
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
  // Typed loosely and awaited on purpose: searchParams is a plain object on
  // Next 14 and a promise on Next 16, and awaiting handles both. Reading
  // `searchParams.session_id` synchronously would return undefined after the
  // upgrade — the page would still render "Order confirmed" while quietly
  // recording nothing.
  searchParams,
}: {
  searchParams: any;
}) {
  const params = await searchParams;
  const sessionId: string | undefined = params?.session_id;
  if (sessionId) await recordOrder(sessionId);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md border p-10 text-center space-y-5">
        <div className="flex justify-center">
          <CheckCircle2 className="h-10 w-10 text-signal" />
        </div>
        <div className="space-y-2">
          <h1 className="display-headline text-2xl">Order confirmed</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thanks — payment went through. A confirmation is on its way, and
            we&apos;ll be in touch to arrange delivery.
          </p>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2 rounded-sm bg-foreground text-background text-sm hover:opacity-90 transition-opacity"
          >
            Back to the catalogue
          </Link>
          <Link
            href="/account/orders"
            className="px-5 py-2 rounded-sm border text-sm hover:bg-muted transition-colors"
          >
            Your orders
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Questions? Email{" "}
          <a
            href="mailto:admin@elffie.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            admin@elffie.com
          </a>
        </p>
      </div>
    </div>
  );
}
