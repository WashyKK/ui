import { NextResponse } from "next/server";
import { GiftCardError, lookupGiftCard } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

/**
 * Check a card's balance before committing to it at checkout.
 *
 * Public, so it is deliberately thin: it reveals a balance only to someone who
 * already holds the code, and returns the same "not recognised" for a wrong
 * code as for a dead one so it cannot be used to enumerate valid codes.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    const card = await lookupGiftCard(String(body?.code ?? ""));
    return NextResponse.json({
      ok: true,
      // Never the id — the browser has no use for it and it is a handle to money.
      code: card.code,
      balanceMinor: card.balanceMinor,
      expiresAt: card.expiresAt,
    });
  } catch (err: any) {
    if (err instanceof GiftCardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not check that card" }, { status: 500 });
  }
}
