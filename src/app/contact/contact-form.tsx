"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const field =
  "w-full h-10 rounded-sm border border-input bg-background px-3 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring";
const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5";

const KINDS = [
  { id: "quote", label: "Pricing or a quote" },
  { id: "support", label: "Help with an order" },
  { id: "enquiry", label: "Something else" },
];

export default function ContactForm() {
  const [kind, setKind] = useState("quote");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, email, phone, company, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your message");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-sm border p-6 flex gap-3">
        <CheckCircle2 className="h-5 w-5 text-signal shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Message sent</p>
          <p className="text-sm text-muted-foreground">
            We have it, and we will reply to {email}. If it is urgent, call the
            number on your invoice or email admin@elffie.com directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className={labelCls}>What is this about?</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={kind === k.id}
              className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                kind === k.id
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="name">Your name</label>
          <input id="name" required className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="company">Company <span className="text-muted-foreground/70">(optional)</span></label>
          <input id="company" className={field} value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input
            id="email" type="email" required className={field}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="phone">Phone <span className="text-muted-foreground/70">(optional)</span></label>
          <input id="phone" type="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="message">What do you need?</label>
        <textarea
          id="message" required rows={6} value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Part numbers, quantities, voltages, and when you need them."
          className={field.replace("h-10", "min-h-[140px] py-2.5")}
        />
      </div>

      {error && (
        <p className="flex gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}
        </p>
      )}

      <Button type="submit" disabled={sending} className="gap-2">
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
