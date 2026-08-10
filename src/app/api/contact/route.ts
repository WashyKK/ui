import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const KINDS = new Set(["enquiry", "quote", "support"]);

/**
 * A public write endpoint, so it is deliberately narrow: fixed set of fields,
 * hard length caps, and one submission per address per minute. Anything more
 * elaborate (a captcha) would cost more in abandoned quote requests than the
 * spam it would stop at this volume.
 */
const RECENT_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 4000);
  const kind = KINDS.has(body.kind) ? body.kind : "enquiry";

  if (!name) return NextResponse.json({ error: "Please tell us your name" }, { status: 400 });
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Please describe what you need in a little more detail" },
      { status: 400 }
    );
  }

  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const { count } = await supabaseServer
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "We already have your message — we'll be in touch shortly." },
      { status: 429 }
    );
  }

  const { error } = await supabaseServer.from("contact_messages").insert({
    kind,
    name,
    email,
    message,
    phone: String(body.phone ?? "").trim().slice(0, 40) || null,
    company: String(body.company ?? "").trim().slice(0, 160) || null,
    subject: String(body.subject ?? "").trim().slice(0, 200) || null,
    product_id: body.productId || null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not send your message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
