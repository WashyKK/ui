import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { findProductBy } from "@/lib/products-query";
import { attributesFor } from "@/lib/attributes.server";
import { loadProductResources } from "@/lib/product-resources.server";
import { aiConfigured, streamChat, systemPrompt, type ChatMessage } from "@/lib/ai";
import { isUuid } from "@/lib/slug";
import { isReachable, isListed } from "@/lib/product-status";
import { effectivePrice } from "@/lib/pricing";
import { getUsdToKesRate, usdToKes } from "@/lib/fx";
import { visitorHash, isBot } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Every call costs money, so this is capped per visitor per hour.
 *
 * The real limit is counted from the question log: an in-memory counter resets
 * on every cold start, so on a serverless host it caps nothing. But this is a
 * public endpoint wired to a billed API key, and the table arrives with a
 * migration that may not have been applied yet — so a missing table falls back
 * to an in-memory count rather than to no limit at all. That fallback is weak
 * by construction, and deliberately weak in the safe direction: it can let a
 * determined attacker through after a cold start, but it cannot leave the
 * endpoint completely uncapped.
 */
const HOURLY_LIMIT = 20;

const MEMORY_COUNTS = new Map<string, { count: number; first: number }>();

function overLimitInMemory(hash: string): boolean {
  const now = Date.now();
  // Opportunistic sweep so a long-lived instance does not grow without bound.
  if (MEMORY_COUNTS.size > 5000) {
    for (const [k, v] of MEMORY_COUNTS) {
      if (now - v.first > 3_600_000) MEMORY_COUNTS.delete(k);
    }
  }
  const rec = MEMORY_COUNTS.get(hash);
  if (!rec || now - rec.first > 3_600_000) {
    MEMORY_COUNTS.set(hash, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > HOURLY_LIMIT;
}

async function overLimit(hash: string): Promise<boolean> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error } = await supabaseServer
    .from("product_questions")
    .select("id", { count: "exact", head: true })
    .eq("visitor_hash", hash)
    .gte("created_at", since);

  // A HEAD request against a table that does not exist comes back with no error
  // AND no count: PostgREST has no response body to carry the error in. So the
  // signal that the log is unavailable is a null count, not just an error —
  // checking only `error` left the cap silently disabled, which is precisely
  // the state this fallback exists to prevent.
  if (error || count === null) {
    console.warn(
      "product_questions unavailable, using in-memory rate limit:",
      error?.message ?? "no count returned (table missing?)"
    );
    return overLimitInMemory(hash);
  }
  return count >= HOURLY_LIMIT;
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
  // The role is client-supplied and was copied through verbatim, which let a
  // crafted request POST a `system` turn — it landed immediately after the real
  // system prompt in ai.ts and could argue with every safety rule above it.
  // Only the two roles a conversation can legitimately contain survive.
  const recent = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-6)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content ?? "").slice(0, 1000),
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
    // The cart rule is only sent when the product can actually be bought — an
    // out-of-stock or unlisted part should not be offered, and an instruction
    // nobody can act on is 40 tokens paid on every question for nothing.
    const canAddToCart = Number(product.stock) > 0 && isListed(product);
    const stream = await streamChat(
      systemPrompt(await buildContext(product), { canAddToCart }),
      recent
    );
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
