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

/** KES major units for a USD amount, rounded up to the shilling. */
export function usdToKes(usd: number, rate = getUsdToKesRate()): number {
  return Math.ceil(usd * rate);
}
