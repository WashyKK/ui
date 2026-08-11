import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminRequest } from "@/lib/auth-check";
import { GiftCardError, issueGiftCard } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("gift_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ ready: false, cards: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cards = data ?? [];
  return NextResponse.json({
    ready: true,
    cards,
    summary: {
      count: cards.length,
      issuedMinor: cards.reduce((s: number, c: any) => s + Number(c.initial_minor), 0),
      // What is still owed to customers — the number that belongs on a balance
      // sheet, not the total ever issued.
      outstandingMinor: cards
        .filter((c: any) => c.status === "active")
        .reduce((s: number, c: any) => s + Number(c.balance_minor), 0),
    },
  });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  // Admins think in shillings; storage is in cents.
  const amountMinor = Math.round(Number(body.amountKes ?? 0) * 100);

  try {
    const card = await issueGiftCard({
      amountMinor,
      issuedTo: body.issuedTo,
      note: body.note,
      expiresAt: body.expiresAt || null,
      issuedBy: (await cookies()).get("admin")?.value === "1"
        ? process.env.ADMIN_EMAIL ?? "admin"
        : "store_manager",
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (err: any) {
    if (err instanceof GiftCardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not issue that card" }, { status: 500 });
  }
}
