import "server-only";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Gift cards, in KES minor units (cents) as integers throughout.
 *
 * Never floats. A float balance drifts by fractions of a cent and drifting
 * money is the one class of bug you cannot apologise your way out of.
 * KSh 1,000 is 100000.
 */

/** No O/0/I/1/S/5 — a code gets read aloud and written down. */
const ALPHABET = "ACDEFGHJKLMNPQRTUVWXYZ2346789";

/**
 * A code nobody can guess. 16 characters from a 29-symbol alphabet is about
 * 78 bits — a card is money, so this is drawn from the CSPRNG rather than
 * Math.random, and never from a counter or a timestamp.
 */
export function generateGiftCardCode(): string {
  const bytes = crypto.randomBytes(16);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `EG-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

export interface GiftCard {
  id: string;
  code: string;
  initialMinor: number;
  balanceMinor: number;
  status: "active" | "disabled" | "expired";
  issuedTo: string | null;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function toCard(row: any): GiftCard {
  return {
    id: row.id,
    code: row.code,
    initialMinor: Number(row.initial_minor),
    balanceMinor: Number(row.balance_minor),
    status: row.status,
    issuedTo: row.issued_to ?? null,
    note: row.note ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
  };
}

export class GiftCardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** True when the tables have not been created yet. */
function schemaMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache/i.test(error.message ?? "")
  );
}

export async function issueGiftCard(input: {
  amountMinor: number;
  issuedTo?: string | null;
  note?: string | null;
  expiresAt?: string | null;
  issuedBy?: string | null;
}): Promise<GiftCard> {
  const amount = Math.round(Number(input.amountMinor));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GiftCardError("Amount must be a positive number");
  }
  if (amount > 100_000_00) {
    // KSh 100,000. A cap is not a limit on generosity, it is a guard against a
    // slipped decimal issuing a fortune.
    throw new GiftCardError("That is over the KSh 100,000 limit for a single card");
  }

  const code = generateGiftCardCode();
  const { data, error } = await supabaseServer
    .from("gift_cards")
    .insert({
      code,
      initial_minor: amount,
      balance_minor: amount,
      issued_to: input.issuedTo?.trim().toLowerCase() || null,
      note: input.note?.trim() || null,
      expires_at: input.expiresAt || null,
      issued_by: input.issuedBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (schemaMissing(error)) {
      throw new GiftCardError("Gift cards need supabase/gift_cards.sql applied first.", 409);
    }
    throw new GiftCardError(error.message, 500);
  }

  await supabaseServer.from("gift_card_transactions").insert({
    gift_card_id: data.id,
    kind: "issue",
    amount_minor: amount,
    balance_after: amount,
    actor: input.issuedBy ?? null,
  });

  return toCard(data);
}

/**
 * Look a card up by code without spending it — for the "check balance" step at
 * checkout, before anyone commits.
 */
export async function lookupGiftCard(code: string): Promise<GiftCard> {
  const trimmed = code.trim();
  if (!trimmed) throw new GiftCardError("Enter a gift card code");

  const { data, error } = await supabaseServer
    .from("gift_cards")
    .select("*")
    .ilike("code", trimmed)
    .maybeSingle();

  if (error && schemaMissing(error)) {
    throw new GiftCardError("Gift cards are not set up yet.", 409);
  }
  // Same message whether the code is wrong or the card is dead, so this cannot
  // be used to discover which codes exist.
  if (!data) throw new GiftCardError("That code was not recognised", 404);

  const card = toCard(data);
  if (card.status !== "active") throw new GiftCardError("That card is no longer usable", 409);
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    throw new GiftCardError("That card has expired", 409);
  }
  if (card.balanceMinor <= 0) throw new GiftCardError("That card has no balance left", 409);

  return card;
}

/**
 * Spend credit against an order.
 *
 * Delegates to the redeem_gift_card Postgres function, which takes a row lock
 * before touching the balance. Doing the read-modify-write here in TypeScript
 * would let two simultaneous checkouts both see the full balance and both spend
 * it — with a gift card, that is somebody else's money.
 */
export async function redeemGiftCard(
  code: string,
  amountMinor: number,
  orderNumber: string
): Promise<{ appliedMinor: number; balanceAfter: number; cardId: string }> {
  const { data, error } = await supabaseServer.rpc("redeem_gift_card", {
    p_code: code.trim(),
    p_amount_minor: Math.round(amountMinor),
    p_order_number: orderNumber,
  });

  if (error) {
    if (schemaMissing(error)) {
      throw new GiftCardError("Gift cards are not set up yet.", 409);
    }
    // The function raises human-readable messages by design.
    throw new GiftCardError(error.message.replace(/^.*?:\s*/, ""), 409);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new GiftCardError("Could not apply that gift card", 500);

  return {
    appliedMinor: Number(row.applied_minor),
    balanceAfter: Number(row.balance_after),
    cardId: row.card_id,
  };
}

/** Put credit back when an order is cancelled or refunded. */
export async function refundGiftCard(
  cardId: string,
  amountMinor: number,
  orderNumber: string
): Promise<number> {
  const { data, error } = await supabaseServer.rpc("refund_gift_card", {
    p_card_id: cardId,
    p_amount_minor: Math.round(amountMinor),
    p_order_number: orderNumber,
  });
  if (error) throw new GiftCardError(error.message, 500);
  return Number(data ?? 0);
}

export const formatKes = (minor: number) => `KSh ${(minor / 100).toLocaleString()}`;
