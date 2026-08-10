"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, Building2, CreditCard, Loader2, Lock,
  MapPin, Package, Smartphone, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { useUser } from "@/context/user";
import { useCurrency } from "@/context/currency";
import { SHIPPING_ZONES, getShippingRate, getShippingLabel } from "@/lib/shipping";
import { KENYA_COUNTIES, isDomesticZone, isValidKraPin, normalizeKenyanPhone } from "@/lib/kenya";
import { getPublicUsdToKesRate } from "@/lib/fx";

const USD_TO_KES = getPublicUsdToKesRate();

type MpesaState =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "sent"; checkoutRequestId: string; amountKES: number }
  | { step: "polling"; checkoutRequestId: string }
  | { step: "success"; receipt?: string }
  | { step: "error"; message: string };

/** Where the order page looks for the email, so a returning buyer needn't retype it. */
export const LAST_ORDER_KEY = "elffie-last-order";

const field =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";
const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5";

export default function CheckoutForm({ paystackEnabled }: { paystackEnabled: boolean }) {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useUser();
  const { format } = useCurrency();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingZone, setShippingZone] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [notes, setNotes] = useState("");

  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");

  const [showBusiness, setShowBusiness] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [poReference, setPoReference] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesa, setMpesa] = useState<MpesaState>({ step: "idle" });

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const domestic = isDomesticZone(shippingZone);
  const shippingRate = shippingZone ? getShippingRate(shippingZone) : 0;
  const orderTotal = totalPrice + shippingRate;
  const totalKes = Math.ceil(orderTotal * USD_TO_KES);

  const problems = useMemo(() => {
    const list: string[] = [];
    if (!email.trim() || !email.includes("@")) list.push("a valid email address");
    if (!shippingZone) list.push("a delivery destination");
    if (!recipientName.trim()) list.push("who is receiving the order");
    if (domestic && !town.trim()) list.push("a delivery town");
    if (!domestic && shippingZone && !line1.trim()) list.push("a street address");
    if (phone.trim() && domestic && !normalizeKenyanPhone(phone)) list.push("a valid Kenyan phone number");
    if (kraPin.trim() && !isValidKraPin(kraPin)) list.push("a valid KRA PIN");
    if (!termsAccepted) list.push("the terms accepted");
    return list;
  }, [email, shippingZone, recipientName, domestic, town, line1, phone, kraPin, termsAccepted]);

  const ready = problems.length === 0 && items.length > 0;

  const payload = () => ({
    items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
    email: email.trim(),
    phone: phone.trim() || undefined,
    shippingZone,
    shippingAmount: shippingRate,
    termsAccepted,
    delivery: {
      recipientName: recipientName.trim(),
      county, town, landmark, pickupPoint, notes,
      line1, city, state, postcode, country,
    },
    business: { companyName, kraPin, poReference },
  });

  const handlePaystack = async () => {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the payment");

      // The order page reads this so the buyer returning from Paystack sees their
      // order without typing an email. Kept out of the URL deliberately.
      localStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({ orderNumber: data.orderNumber, email: email.trim() })
      );
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // Legacy Daraja path, kept until Paystack has settled real money. Unchanged in
  // behaviour from the cart drawer it moved out of.
  const handleMpesa = async () => {
    if (!ready) return;
    setMpesa({ step: "loading" });
    setError(null);
    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the prompt");
      setMpesa({ step: "sent", checkoutRequestId: data.checkoutRequestId, amountKES: data.amountKES });
    } catch (err: any) {
      setMpesa({ step: "error", message: err.message });
    }
  };

  const pollMpesa = async (checkoutRequestId: string) => {
    setMpesa({ step: "polling", checkoutRequestId });
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/mpesa/status?checkoutRequestId=${checkoutRequestId}`);
        const data = await res.json();
        if (data.status === "completed") {
          clearCart();
          setMpesa({ step: "success", receipt: data.receipt });
          return;
        }
        if (data.status === "failed") {
          setMpesa({ step: "error", message: data.message || "The payment was not completed" });
          return;
        }
      } catch {}
    }
    setMpesa({ step: "error", message: "Timed out. Check your M-Pesa messages before retrying." });
  };

  const handleStripe = async () => {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start the payment");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <Package className="h-12 w-12 text-muted-foreground opacity-25 mx-auto" />
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">
          Add something from the catalogue and it will show up here.
        </p>
        <Button asChild className="mt-2"><Link href="/store">Browse the catalogue</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <Link
        href="/store"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the catalogue
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
        <div className="space-y-8 min-w-0">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-muted-foreground" /> Where is this going?
            </h2>

            <div>
              <label className={labelCls} htmlFor="zone">Destination</label>
              <select
                id="zone" className={field} value={shippingZone}
                onChange={(e) => setShippingZone(e.target.value)}
              >
                <option value="">— Select a destination —</option>
                {SHIPPING_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.label} — ${z.rate}</option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="recipient">Recipient name</label>
                <input
                  id="recipient" className={field} value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who signs for the delivery"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="phone">
                  Phone {domestic && <span className="text-muted-foreground/70">(for the rider)</span>}
                </label>
                <input
                  id="phone" className={field} value={phone} type="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={domestic ? "07XX XXX XXX" : "+…"}
                />
              </div>
            </div>

            {domestic ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="county">County</label>
                    <select id="county" className={field} value={county} onChange={(e) => setCounty(e.target.value)}>
                      <option value="">— Select —</option>
                      {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="town">Town or estate</label>
                    <input
                      id="town" className={field} value={town}
                      onChange={(e) => setTown(e.target.value)} placeholder="e.g. Ruaraka"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="landmark">Nearest landmark</label>
                    <input
                      id="landmark" className={field} value={landmark}
                      onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. opposite Naivas"
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="pickup">Courier pickup point</label>
                    <input
                      id="pickup" className={field} value={pickupPoint}
                      onChange={(e) => setPickupPoint(e.target.value)} placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            ) : shippingZone ? (
              <div className="space-y-4">
                <div>
                  <label className={labelCls} htmlFor="line1">Street address</label>
                  <input id="line1" className={field} value={line1} onChange={(e) => setLine1(e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="city">City</label>
                    <input id="city" className={field} value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="state">State / region</label>
                    <input id="state" className={field} value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="postcode">Postal code</label>
                    <input id="postcode" className={field} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="country">Country</label>
                  <input id="country" className={field} value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div>
              <label className={labelCls} htmlFor="notes">Delivery instructions</label>
              <textarea
                id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, best time to deliver, who to call on arrival"
                className={field.replace("h-10", "min-h-[64px] py-2")}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-muted-foreground" /> Contact
            </h2>
            <div>
              <label className={labelCls} htmlFor="email">Email — where the receipt goes</label>
              <input
                id="email" type="email" className={field} value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@company.co.ke"
              />
            </div>
          </section>

          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setShowBusiness((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold hover:text-muted-foreground transition-colors"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Buying for a company?
              <span className="text-xs font-normal text-muted-foreground">
                {showBusiness ? "Hide" : "Add PO and KRA PIN"}
              </span>
            </button>

            {showBusiness && (
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls} htmlFor="company">Company</label>
                  <input id="company" className={field} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="kra">KRA PIN</label>
                  <input
                    id="kra" className={field} value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())} placeholder="A012345678Z"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="po">PO / quote reference</label>
                  <input id="po" className={field} value={poReference} onChange={(e) => setPoReference(e.target.value)} />
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 space-y-4 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Order summary</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex gap-3 items-start">
                <div className="relative h-12 w-12 rounded-md overflow-hidden shrink-0 border bg-muted">
                  {product.imageUrl && (
                    <Image src={product.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {quantity}</p>
                </div>
                <p className="text-sm tabular-nums">{format(product.price * quantity)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-3 border-t text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span className="tabular-nums">{format(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping{shippingZone ? ` — ${getShippingLabel(shippingZone)}` : ""}</span>
              <span className="tabular-nums">{shippingZone ? format(shippingRate) : "—"}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1.5 border-t">
              <span>Total</span><span className="tabular-nums">{format(orderTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Charged as KSh {totalKes.toLocaleString()}
            </p>
          </div>

          <label className="flex gap-2.5 items-start text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox" checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-input"
            />
            <span>
              I accept the <Link href="/legal/terms" className="underline hover:text-foreground">terms of sale</Link>{" "}
              and the <Link href="/legal/returns" className="underline hover:text-foreground">returns policy</Link>.
            </span>
          </label>

          {error && (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {!ready && problems.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Still needed: {problems.join(", ")}.
            </p>
          )}

          {paystackEnabled ? (
            <Button className="w-full gap-2" disabled={!ready || submitting} onClick={handlePaystack}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {submitting ? "Opening payment…" : `Pay KSh ${totalKes.toLocaleString()}`}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button className="w-full gap-2" disabled={!ready || submitting} onClick={handleStripe}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Pay by card
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {mpesa.step === "idle" && (
                <Button
                  variant="outline" className="w-full gap-2"
                  disabled={!ready || !normalizeKenyanPhone(phone)}
                  onClick={handleMpesa}
                >
                  <Smartphone className="h-4 w-4" />
                  M-Pesa — KSh {totalKes.toLocaleString()}
                </Button>
              )}

              {(mpesa.step === "loading" || mpesa.step === "polling") && (
                <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mpesa.step === "loading" ? "Sending the prompt…" : "Waiting for confirmation…"}
                </p>
              )}

              {mpesa.step === "sent" && (
                <div className="rounded-lg border p-3 space-y-2.5">
                  <p className="text-sm">
                    Check your phone and enter your M-Pesa PIN to pay
                    KSh {mpesa.amountKES.toLocaleString()}.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => pollMpesa(mpesa.checkoutRequestId)}>
                      I&apos;ve paid
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMpesa({ step: "idle" })}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {mpesa.step === "success" && (
                <div className="rounded-lg border border-green-600/30 bg-green-50 dark:bg-green-950/30 p-3">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Payment confirmed{mpesa.receipt ? ` — ${mpesa.receipt}` : ""}. A receipt is on its way.
                  </p>
                </div>
              )}

              {mpesa.step === "error" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs text-destructive">{mpesa.message}</p>
                  <button
                    onClick={() => setMpesa({ step: "idle" })}
                    className="text-xs underline text-destructive mt-1"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!normalizeKenyanPhone(phone) && (
                <p className="text-xs text-muted-foreground text-center">
                  Add a Kenyan phone number above to pay by M-Pesa.
                </p>
              )}
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className="h-3 w-3" /> M-Pesa and cards, on one secure page
          </p>
        </aside>
      </div>
    </div>
  );
}
