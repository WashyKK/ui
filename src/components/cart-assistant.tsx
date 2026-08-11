"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useCart } from "@/context/cart";
import { useCurrency } from "@/context/currency";
import { answerCartLocally } from "@/lib/assistant-intents";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Ask about your cart.
 *
 * Deliberately lopsided: nearly everything anyone asks a cart — what is in it,
 * what does it come to, how many of that did I add — is arithmetic over data
 * already sitting in the browser. Handing those to a language model is the most
 * expensive way to get a total and the least reliable, so they never leave the
 * page.
 *
 * What does reach the model is the part it is good at and the page is not:
 * "will these work together", "am I missing anything". Those go up with a
 * compact summary of the cart — names, quantities, line totals — and nothing
 * else.
 *
 * It cannot change the cart or take payment. Adding to a cart is reversible and
 * visible; spending someone's money on their behalf from a chat box is neither,
 * so that line is drawn in the prompt and again in the fact that there is no
 * endpoint for it.
 */
const STARTERS = ["What's in my cart?", "Am I missing anything?", "What's the total?"];

export default function CartAssistant() {
  const { items, totalPrice } = useCart();
  const { format } = useCurrency();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);

    // Free path: the cart is right here.
    const local = answerCartLocally(text, localLines(), localTotal(), format);
    if (local) {
      setTurns((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: local.text },
      ]);
      return;
    }

    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/cart/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          // Ids and quantities only. The server re-reads name, price and stock
          // from the database rather than trusting a browser-supplied price —
          // the same rule the checkout follows.
          cart: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not get an answer");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...history, { role: "assistant", content: answer }]);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
      if (!answer.trim()) throw new Error("No answer came back — try rephrasing.");
    } catch (err: any) {
      setError(err.message);
      setTurns(history);
    } finally {
      setStreaming(false);
    }
  };

  function localLines() {
    return items.map((i) => ({
      name: i.product.name,
      quantity: i.quantity,
      lineUsd: i.product.price * i.quantity,
    }));
  }
  function localTotal() {
    return totalPrice;
  }

  if (!items.length) return null;

  return (
    <div className="border-t">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Ask about this order
        </button>
      ) : (
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Ask about this order</h3>
          </div>

          {turns.length > 0 && (
            <div ref={scrollRef} className="max-h-56 overflow-y-auto space-y-3">
              {turns.map((turn, i) => (
                <div key={i} className={turn.role === "user" ? "text-right" : ""}>
                  <div
                    className={`inline-block text-sm leading-relaxed text-left max-w-[90%] ${
                      turn.role === "user"
                        ? "bg-foreground text-background px-3 py-1.5 rounded-sm"
                        : "text-muted-foreground whitespace-pre-wrap"
                    }`}
                  >
                    {turn.content ||
                      (streaming && i === turns.length - 1 ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                        </span>
                      ) : null)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {turns.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="px-2 py-1 rounded-sm border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this order"
              aria-label="Ask about this order"
              maxLength={500}
              className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="Send"
              className="h-9 w-9 grid place-items-center rounded-sm bg-foreground text-background disabled:opacity-40"
            >
              {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
            </button>
          </form>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
