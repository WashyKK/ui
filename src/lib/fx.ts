/**
 * USD to KES.
 *
 * Products are priced in USD; Paystack and M-Pesa charge in KES. There used to
 * be two independent constants for this — one for display, one for charging —
 * which could drift apart and show a customer a different number from the one
 * they were debited. Both now read from here, and the rate used is recorded on
 * every order so a later rate change never rewrites what someone actually paid.
 */
export const DEFAULT_USD_TO_KES = 130;

function parseRate(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Server-side rate, used to compute what the customer is actually charged. */
export function getUsdToKesRate(): number {
  return (
    parseRate(process.env.USD_TO_KES_RATE) ??
    parseRate(process.env.MPESA_USD_TO_KES_RATE) ??
    parseRate(process.env.NEXT_PUBLIC_USD_TO_KES_RATE) ??
    DEFAULT_USD_TO_KES
  );
}

/** Client-side rate, used only to display prices. Must track the server rate. */
export function getPublicUsdToKesRate(): number {
  return (
    parseRate(process.env.NEXT_PUBLIC_USD_TO_KES_RATE) ??
    parseRate(process.env.NEXT_PUBLIC_MPESA_USD_TO_KES_RATE) ??
    DEFAULT_USD_TO_KES
  );
}

/**
 * KES major units for a USD amount, to the nearest shilling.
 *
 * This was `ceil`, which never undercharges — but the shop sets its prices in
 * shillings and the USD column only holds two decimals, so rounding up pushed
 * seven of fourteen products a shilling above the price the owner actually set:
 * a KSh 1,400 board quoted and billed at KSh 1,401. Rounding to nearest gets
 * twelve of them exactly right.
 *
 * The cost is that an order total can come out up to half a shilling under the
 * exact conversion — this is applied to the total, not per line — which is not
 * a sum worth misquoting every price to protect.
 *
 * The two that are still off (both KSh 600) are unrepresentable: 600/130 is
 * 4.6153…, and neither 4.61 nor 4.62 lands on 600 at any rounding. Fixing those
 * properly means storing the price in KES rather than deriving it from USD.
 */
export function usdToKes(usd: number, rate = getUsdToKesRate()): number {
  return Math.round(usd * rate);
}
