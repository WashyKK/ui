import crypto from "node:crypto";

/**
 * Paystack.
 *
 * One integration covering M-Pesa and cards: which methods appear on the
 * checkout is a dashboard setting (Preferences → Channels), not something this
 * code selects. That is the whole reason for choosing it — the alternative was
 * maintaining a hand-rolled Daraja STK flow alongside a separate card processor,
 * each with its own callback, its own reconciliation and its own failure modes.
 */
const API = "https://api.paystack.co";

export function paystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function isPaystackConfigured(): boolean {
  return Boolean(paystackSecretKey());
}

async function paystackFetch(path: string, init: RequestInit = {}) {
  const key = paystackSecretKey();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.status) {
    throw new Error(body?.message || `Paystack ${path} failed (${res.status})`);
  }
  return body.data;
}

export interface InitializeParams {
  email: string;
  /** Minor units — cents for USD, but for KES Paystack still expects ×100. */
  amountMinor: number;
  currency: "KES" | "USD";
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  phone?: string;
}

export async function initializeTransaction(params: InitializeParams): Promise<{
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}> {
  const data = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountMinor,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: {
        ...(params.metadata ?? {}),
        ...(params.phone ? { phone: params.phone } : {}),
      },
    }),
  });

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export interface VerifiedTransaction {
  status: string;
  reference: string;
  amountMinor: number;
  currency: string;
  paidAt: string | null;
  channel: string | null;
  receipt: string | null;
}

/**
 * Ask Paystack what really happened. The webhook is the primary signal, but the
 * browser also comes back to a return URL and a customer should not have to wait
 * on webhook delivery to see their order — so both paths verify here.
 */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  return {
    status: data.status,
    reference: data.reference,
    amountMinor: Number(data.amount),
    currency: data.currency,
    paidAt: data.paid_at ?? null,
    channel: data.channel ?? null,
    // Mobile-money charges carry the M-Pesa receipt here; cards have no equivalent.
    receipt: data.authorization?.receiver_bank_account_number ?? data.reference ?? null,
  };
}

/**
 * Paystack signs every webhook with HMAC-SHA512 over the raw body, keyed by the
 * secret key. Compared in constant time — a timing-safe comparison costs nothing
 * and a naive === on a signature is a classic oracle.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = paystackSecretKey();
  if (!key || !signature) return false;

  const expected = crypto.createHmac("sha512", key).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
