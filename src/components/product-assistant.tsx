"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Ask about this part.
 *
 * The model is given this product's real data and told it may not state a
 * specification that is not in it. That constraint is the whole design: an
 * invented voltage rating on an industrial component is not a bad answer, it is
 * someone wiring 24 V into a 5 V board. The disclaimer under the box says the
 * same thing to the customer, because a confident tone is exactly what makes a
 * wrong answer dangerous.
 */
const STARTERS = [
  "What is this used for?",
  "What do I need to run it?",
  "Is it right for my project?",
];

export default function ProductAssistant({
  productSlug,
  productName,
}: {
  productSlug: string;
  productName: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);

  // Bring the top of the newest exchange into view — not the bottom of the box.
  // An answer is usually taller than the box on a phone, so scrolling to the
  // bottom drops the reader into the middle of a sentence with the question
  // they asked already off-screen. Keyed on turn count, not on content, so it
  // positions once when the answer starts and then leaves the reader alone
  // while it streams in under them.
  useEffect(() => {
    const container = scrollRef.current;
    const latest = latestRef.current;
    if (!container || !latest) return;
    container.scrollTo({ top: latest.offsetTop - container.offsetTop, behavior: "smooth" });
  }, [turns.length]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || streaming) return;

    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productSlug}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not get an answer");
      }

      // Append as it arrives, so the answer starts reading immediately rather
      // than landing all at once after several seconds.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...history, { role: "assistant", content: answer }]);
      }
      if (!answer.trim()) throw new Error("No answer came back — try rephrasing.");
    } catch (err: any) {
      setError(err.message);
      setTurns(history);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <section className="border">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Ask about this part</h2>
      </div>

      {turns.length > 0 && (
        <div ref={scrollRef} className="max-h-96 overflow-y-auto px-4 py-4 space-y-4">
          {turns.map((turn, i) => (
            <div
              key={i}
              // The last question asked: where the reader should be looking.
              ref={i === turns.length - 2 ? latestRef : undefined}
              className={turn.role === "user" ? "text-right" : ""}
            >
              <div
                className={`inline-block text-sm leading-relaxed text-left max-w-[85%] ${
                  turn.role === "user"
                    ? "bg-foreground text-background px-3 py-2 rounded-sm"
                    : "text-muted-foreground whitespace-pre-wrap"
                }`}
              >
                {turn.content ||
                  (streaming && i === turns.length - 1 ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Reading the datasheet…
                    </span>
                  ) : null)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 space-y-3">
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="px-2.5 py-1.5 rounded-sm border text-xs text-muted-foreground hover:text-foreground hover:border-graphite transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask anything about the ${productName}`}
            aria-label={`Ask about the ${productName}`}
            maxLength={1000}
            className="flex-1 h-10 rounded-sm border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            aria-label="Send"
            className="h-10 w-10 grid place-items-center rounded-sm bg-foreground text-background disabled:opacity-40 transition-opacity"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          Answers come from this listing and the assistant can still be wrong —
          the manufacturer&apos;s datasheet is what governs. For anything you are
          going to wire up, check it there or{" "}
          <a href="/contact" className="underline hover:text-foreground">ask us</a>.
        </p>
      </div>
    </section>
  );
}
