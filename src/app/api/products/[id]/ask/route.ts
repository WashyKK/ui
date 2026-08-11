import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { findProductBy } from "@/lib/products-query";
import { attributesFor } from "@/lib/attributes.server";
import { loadProductResources } from "@/lib/product-resources.server";
import { aiConfigured, streamChat, systemPrompt, type ChatMessage } from "@/lib/ai";
import { isUuid } from "@/lib/slug";
import { isReachable } from "@/lib/product-status";
import { effectivePrice } from "@/lib/pricing";
import { getUsdToKesRate, usdToKes } from "@/lib/fx";
import { visitorHash, isBot } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Every call costs money, so this is capped per visitor per hour. The limit is
 * counted from the question log rather than an in-memory counter, which would
 * reset on every cold start and cap nothing.
 */
const HOURLY_LIMIT = 20;

async function overLimit(hash: string): Promise<boolean> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error } = await supabaseServer
    .from("product_questions")
    .select("id", { count: "exact", head: true })
    .eq("visitor_hash", hash)
    .gte("created_at", since);
  // A missing table must not lock the feature out entirely.
  if (error) return false;
  return (count ?? 0) >= HOURLY_LIMIT;
}

/** Everything the model is allowed to treat as fact. */
async function buildContext(product: any): Promise<string> {
  const [attributes, resources] = await Promise.all([
    attributesFor(product.id).catch(() => []),
    loadProductResources(product.id).catch(() => ({ documents: [], links: [], snippets: [] })),
  ]);

  const price = effectivePrice(product);
  const kes = usdToKes(price.price, getUsdToKesRate());

  const lines: string[] = [
    `Name: ${product.name}`,
    product.mpn ? `Manufacturer part number: ${product.mpn}` : null,
    product.manufacturer ? `Manufacturer: ${product.manufacturer}` : null,
    product.category ? `Category: ${product.category}` : null,
    `Price: KSh ${kes.toLocaleString()}${price.onSale ? ` (on sale, ${price.percentOff}% off)` : ""}`,
    Number(product.stock) > 0
      ? `In stock: ${product.stock} available`
      : "Out of stock — customers can ask to be notified when it returns",
  ].filter(Boolean) as string[];

  if (product.description) lines.push(`\nDescription as written by the shop:\n${product.description}`);

  if (attributes.length) {
    lines.push("\nSpecifications on record:");
    for (const a of attributes) {
      lines.push(`- ${a.label}: ${a.value}${a.unit ? ` ${a.unit}` : ""}`);
    }
  } else {
    lines.push("\nNo structured specifications are on record for this part.");
  }

  if (resources.documents.length) {
    lines.push("\nDocuments available on this page:");
    for (const d of resources.documents) lines.push(`- ${d.title} (${d.kind})`);
  } else if (product.datasheet_url) {
    lines.push("\nA datasheet PDF is available on this page.");
  } else {
    lines.push("\nNo datasheet is attached to this listing.");
  }

  if (resources.links.length) {
    lines.push("\nReference links on this page:");
    for (const l of resources.links) lines.push(`- ${l.title}`);
  }
  if (resources.snippets.length) {
    lines.push("\nExample code on this page:");
    for (const s of resources.snippets) lines.push(`- ${s.title} (${s.language})`);
  }

  return lines.join("\n");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "The assistant is not switched on yet." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  const question = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  if (!question.trim()) {
    return NextResponse.json({ error: "Ask a question first" }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "That question is too long" }, { status: 400 });
  }

  const hash = visitorHash(req);
  if (isBot(req)) return NextResponse.json({ error: "Not available" }, { status: 403 });
  if (await overLimit(hash)) {
    return NextResponse.json(
      { error: "That is a lot of questions in one hour. Try again shortly, or send us a message." },
      { status: 429 }
    );
  }

  const product = await findProductBy(isUuid(id) ? "id" : "slug", id);
  if (!product || !isReachable(product)) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Only the last few turns: the context is the product, not the conversation,
  // and an unbounded history is an unbounded bill.
  const recent = messages.slice(-6).map((m) => ({
    role: m.role,
    content: String(m.content).slice(0, 1000),
  }));

  // What people ask is a demand signal in the same way a zero-result search is.
  // Fire and forget — a logging failure must not cost someone their answer.
  supabaseServer
    .from("product_questions")
    .insert({
      product_id: product.id,
      question: question.slice(0, 500),
      visitor_hash: hash,
    })
    .then(undefined, () => undefined);

  try {
    const stream = await streamChat(systemPrompt(await buildContext(product)), recent);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("product assistant failed:", err?.message);
    return NextResponse.json(
      { error: "The assistant could not answer just now." },
      { status: 502 }
    );
  }
}
