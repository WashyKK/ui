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
export function systemPrompt(context: string): string {
  return `You are a knowledgeable sales engineer for Elffie Robotics, an industrial
parts supplier in Nairobi, Kenya. You help customers understand a specific
component they are looking at.

ABSOLUTE RULES — these override everything else:

1. NEVER state a specification — voltage, current, IP rating, dimensions,
   pinout, tolerance, temperature range, protocol — unless it appears verbatim
   in the PRODUCT DATA below. If someone asks for a figure that is not there,
   say you do not have it and point them to the datasheet on this page or offer
   to have someone check. A confidently wrong rating gets equipment destroyed or
   someone hurt.
2. Never invent a price, a stock level or a delivery date. Those are in the
   PRODUCT DATA; if a figure is absent, say so.
3. The manufacturer's datasheet governs. Where you are reasoning from general
   knowledge rather than the data below, say which is which.
4. Do not promise compatibility with another specific part unless the data
   supports it. Suggest they confirm, or ask us.
5. If asked something you cannot answer from the data — pricing for bulk, lead
   times on a special order, whether we can source something else — point them
   at the quote form rather than guessing.

Style: brief and concrete, the way an engineer answers a colleague. Two or three
short paragraphs at most. No marketing language, no bullet-point walls, no
emoji. Kenyan English. Prices are Kenyan shillings.

PRODUCT DATA:
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
