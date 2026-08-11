import "server-only";

/**
 * The product assistant's model call.
 *
 * OpenAI-compatible, talked to over plain fetch rather than a client library —
 * it is one endpoint, and the SSE parsing below is shorter than the dependency
 * would be. OPENAI_BASE_URL means any compatible provider works without a code
 * change.
 */
const DEFAULT_MODEL = "gpt-4o-mini";

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function aiModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function baseUrl(): string {
  return (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

/**
 * The rules the assistant works under.
 *
 * The hard one is the first: this shop sells industrial parts, and a confidently
 * invented voltage rating or IP figure is not a bad answer, it is somebody
 * wiring 24 V into a 5 V board or trusting an enclosure that is not rated for
 * where they put it. So the model may only state specifications that appear in
 * the context below, and must say plainly when it does not know.
 */
/**
 * Compressed deliberately. This prefix is paid on every single question, so
 * every word in it is rent. The earlier version cost 323 tokens; this one says
 * the same things in roughly half that, and the safety rule that matters is
 * still the first thing the model reads. Prose was cut, not constraints.
 */
export function systemPrompt(context: string, opts: { canAddToCart?: boolean } = {}): string {
  return `Sales engineer for Elffie Robotics, industrial parts, Nairobi. Kenyan English, prices in KSh. Answer like an engineer to a colleague: two short paragraphs, no marketing, no emoji, no bullet walls.

RULES, above all else:
1. Never state a spec — voltage, current, IP, dimensions, pinout, tolerance, temperature, protocol — unless it appears verbatim in DATA. Missing? Say so and point to the datasheet on this page. A wrong rating destroys equipment or hurts someone.
2. Never invent a price, stock level or delivery date. If it is not in DATA, say so.
3. The manufacturer's datasheet governs. Flag when you are reasoning from general knowledge rather than DATA.
4. Do not promise compatibility with a specific part unless DATA supports it.
5. Bulk pricing, lead times, sourcing something we do not list: point at the quote form, do not guess.${
    opts.canAddToCart
      ? `\n6. If they ask to buy or add this to their cart, confirm in one short sentence and end with [[cart:add:2]] — an actual digit, never the letter N. Infer the quantity from what they said; if they did not say, use 1. Never exceed the stock in DATA. Never ask them to specify. Only on an explicit request to buy or add.`
      : ""
  }

DATA:
${context}`;
}

/**
 * The cart assistant's prompt.
 *
 * Separate and much smaller, because the cart is a different job: the customer
 * is not researching a part, they are checking they have not forgotten
 * something. Anything that is plain arithmetic over the cart has already been
 * answered in the browser for nothing, so what reaches here is only the
 * judgement questions — "will this work together", "am I missing anything".
 */
export function cartSystemPrompt(context: string): string {
  return `Sales engineer for Elffie Robotics, industrial parts, Nairobi. The customer is reviewing their cart. Kenyan English, KSh. One short paragraph, plain and concrete.

RULES:
1. Never state a spec not in CART. No invented voltages, ratings or compatibility claims — a wrong one here gets something wired up wrong.
2. Never invent prices or totals. They are in CART.
3. You may point out a plausible gap ("a stepper driver usually needs its own supply") as a question to check, never as a fact about these parts.
4. You cannot change the cart or take payment. Direct them to the cart controls or the quote form.

CART:
${context}`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream a completion back as plain text chunks.
 *
 * Returns a ReadableStream of text so the route can pipe it straight to the
 * browser — the answer starts appearing in about a second rather than after the
 * whole thing is generated.
 */
export async function streamChat(
  system: string,
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const upstream = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel(),
      stream: true,
      // Low temperature: this is a technical assistant, and creative variation
      // in a specification is exactly the failure mode to avoid.
      temperature: 0.2,
      max_tokens: 600,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(`Model request failed (${upstream.status}) ${detail.slice(0, 200)}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // SSE frames are separated by a blank line; a chunk can split one, so
          // keep the tail in the buffer until the next read completes it.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // A malformed frame is not worth failing the whole answer over.
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
