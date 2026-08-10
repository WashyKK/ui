"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user";

/**
 * Shown in place of the buy button when a part is out of stock.
 *
 * The page used to say "Out of Stock" and stop there, which loses a customer
 * who has already decided they want this exact part — and for a lot of what
 * this shop sells there is no easy local substitute to send them to.
 */
export default function StockAlertForm({ productId }: { productId: string }) {
  const { user } = useUser();
  const [email, setEmail] = useState(user?.email ?? "");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your request");
      setState("done");
    } catch (err: any) {
      setError(err.message);
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-sm border p-4 flex gap-3">
        <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          We&apos;ll email <span className="text-foreground">{email}</span> the moment
          this is back. One message, then we stop.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-sm border p-4 space-y-3">
      <div className="flex gap-2.5">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Out of stock</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tell us where to reach you and we&apos;ll let you know when it lands.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.co.ke"
          aria-label="Email address for the back-in-stock alert"
          className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
