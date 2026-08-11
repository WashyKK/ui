import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { aiConfigured, streamChat, cartSystemPrompt, type ChatMessage } from "@/lib/ai";
import { effectivePrice } from "@/lib/pricing";
import { getUsdToKesRate, usdToKes } from "@/lib/fx";
import { visitorHash, isBot } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const HOURLY_LIMIT = 12;
const MEMORY = new Map<string, { count: number; first: number }>();

/**
 * In-memory only, unlike the product assistant.
 *
 * A cart question is rarer than a product question by construction — most of
 * them are answered in the browser and never arrive here — so the weaker cap is
 * proportionate, and it avoids a second table for a handful of rows a day.
 */
function overLimit(hash: string): boolean {
  const now = Date.now();
  if (MEMORY.size > 5000) {
    for (const [k, v] of MEMORY) if (now - v.first > 3_600_000) MEMORY.delete(k);
  }
  const rec = MEMORY.get(hash);
  if (!rec || now - rec.first > 3_600_000) {
    MEMORY.set(hash, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > HOURLY_LIMIT;
}

export async function POST(req: Request) {
  if (!aiConfigured()) {
    return NextResponse.json({ error: "The assistant is not switched on yet." }, { status: 503 });
  }
  if (isBot(req)) return NextResponse.json({ error: "Not available" }, { status: 403 });

  const hash = visitorHash(req);
  if (overLimit(hash)) {
    return NextResponse.json(
      { error: "That is a lot of questions in one hour. Try again shortly, or send us a message." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const cart: { productId: string; quantity: number }[] = Array.isArray(body?.cart) ? body.cart : [];

  const question = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  if (!question.trim()) return NextResponse.json({ error: "Ask a question first" }, { status: 400 });
  if (question.length > 500) return NextResponse.json({ error: "That question is too long" }, { status: 400 });
  if (!cart.length) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  // Prices and names come from the database, never from the request body. The
  // browser says *what* is in the cart; it does not get to say what it costs.
  const ids = [...new Set(cart.map((c) => c.productId))].slice(0, 40);
  const { data: rows } = await supabaseServer
    .from("products")
    .select("id, name, price, sale_price, sale_starts_at, sale_ends_at, stock, category, mpn")
    .in("id", ids);

  if (!rows?.length) return NextResponse.json({ error: "Could not read those items." }, { status: 400 });

  const byId = new Map(rows.map((r) => [r.id, r]));
  const rate = getUsdToKesRate();
  let totalKes = 0;
  const lines: string[] = [];

  for (const line of cart) {
    const p = byId.get(line.productId);
    if (!p) continue;
    const qty = Math.max(1, Math.min(999, Number(line.quantity) || 1));
    const unitKes = usdToKes(effectivePrice(p).price, rate);
    totalKes += unitKes * qty;
    // One line per item, kept terse — this whole block is paid for on every
    // cart question, so it carries what a person needs to reason about the
    // order and nothing decorative.
    lines.push(`- ${qty} x ${p.name}${p.mpn ? ` (${p.mpn})` : ""}, ${p.category ?? "uncategorised"}, KSh ${Math.round(unitKes * qty).toLocaleString()}`);
  }

  const context = `${lines.join("\n")}\nTotal KSh ${Math.round(totalKes).toLocaleString()}, before delivery.`;

  try {
    const safe = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-4)
      .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content ?? "").slice(0, 500) }));
    const stream = await streamChat(cartSystemPrompt(context), safe);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("cart assistant failed:", err.message);
    return NextResponse.json({ error: "The assistant could not answer just now." }, { status: 502 });
  }
}
