import type { Metadata } from "next";
import { isPaystackConfigured } from "@/lib/paystack";
import CheckoutForm from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  // Whether Paystack is live is a server fact; the form needs it to decide
  // between one payment button and the legacy card/M-Pesa pair.
  return <CheckoutForm paystackEnabled={isPaystackConfigured()} />;
}
