"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Check, Copy, Gift, Loader2, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Grid from "@/components/admin/grid";

const kes = (minor: number) => `KSh ${(Number(minor) / 100).toLocaleString()}`;
const PRESETS = [500, 1000, 2500, 5000, 10000];

export default function GiftCardsPanel() {
  const [cards, setCards] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const [amount, setAmount] = useState("1000");
  const [issuedTo, setIssuedTo] = useState("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gift-cards", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not load gift cards");
      setReady(d.ready !== false);
      setCards(d.cards ?? []);
      setSummary(d.summary ?? null);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKes: Number(amount), issuedTo, note, expiresAt: expiresAt || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not issue that card");
      setIssued(d.card);
      load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const columns = useMemo<ColDef<any>[]>(() => [
    {
      headerName: "Code", field: "code", pinned: "left", minWidth: 230,
      cellClass: "font-mono text-[12px]",
    },
    {
      headerName: "Balance", field: "balance_minor", minWidth: 130, type: "rightAligned",
      filter: "agNumberColumnFilter", cellClass: "tabular-nums",
      valueGetter: (p) => Number(p.data?.balance_minor ?? 0),
      valueFormatter: (p) => kes(p.value),
    },
    {
      headerName: "Issued for", field: "initial_minor", minWidth: 130, type: "rightAligned",
      cellClass: "tabular-nums text-muted-foreground",
      valueGetter: (p) => Number(p.data?.initial_minor ?? 0),
      valueFormatter: (p) => kes(p.value),
    },
    {
      headerName: "Status", field: "status", minWidth: 110,
      cellRenderer: (p: ICellRendererParams) => {
        const spent = Number(p.data?.balance_minor) === 0;
        if (p.value !== "active") {
          return <span className="text-xs text-muted-foreground capitalize">{p.value}</span>;
        }
        return spent
          ? <span className="text-xs text-muted-foreground">Used up</span>
          : <span className="text-xs">Active</span>;
      },
    },
    { headerName: "Issued to", field: "issued_to", minWidth: 190, valueFormatter: (p) => p.value || "—" },
    { headerName: "Note", field: "note", minWidth: 180, valueFormatter: (p) => p.value || "—", cellClass: "text-muted-foreground" },
    {
      headerName: "Expires", field: "expires_at", minWidth: 120,
      valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—",
    },
    {
      headerName: "Issued", field: "created_at", minWidth: 120,
      valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—",
    },
  ], []);

  if (!ready) {
    return (
      <div className="border p-6 space-y-2">
        <h2 className="text-lg font-semibold">Gift cards</h2>
        <p className="text-sm text-muted-foreground">
          Not set up yet — <code className="rounded-sm bg-muted px-1">supabase/gift_cards.sql</code> has not been applied.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Gift cards</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Store credit in shillings. Redeemed at checkout against the order
            total; anything left stays on the card.
          </p>
        </div>
        <Button onClick={() => { setIssued(null); setOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Issue card
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border p-4">
            <p className="label-micro text-muted-foreground">Cards</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{summary.count}</p>
          </div>
          <div className="border p-4">
            <p className="label-micro text-muted-foreground">Issued</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{kes(summary.issuedMinor)}</p>
          </div>
          <div className="border p-4">
            <p className="label-micro text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{kes(summary.outstandingMinor)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">still owed to customers</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-3 py-2">{error}</p>
      )}

      <Grid
        rowData={cards} columnDefs={columns} exportName="elffie-gift-cards"
        loading={loading} height={480}
        overlayNoRowsTemplate={'<span class="text-sm text-muted-foreground">No gift cards issued yet.</span>'}
      />

      <Sheet open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{issued ? "Card issued" : "Issue a gift card"}</SheetTitle>
          </SheetHeader>

          {issued ? (
            <div className="flex-1 px-6 py-5 space-y-4">
              <div className="rounded-sm border p-4 text-center space-y-2">
                <Gift className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="font-mono text-sm break-all">{issued.code}</p>
                <p className="text-2xl font-semibold tabular-nums">{kes(issued.balanceMinor)}</p>
              </div>
              <Button
                variant="outline" className="w-full gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(issued.code).then(() => {
                    setCopied(true); setTimeout(() => setCopied(false), 1800);
                  }).catch(() => {});
                }}
              >
                {copied ? <Check className="h-4 w-4 text-signal" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy the code"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Send this to the customer. Anyone holding the code can spend it,
                so treat it like cash — it is shown here once, but you can always
                find it again in the table.
              </p>
            </div>
          ) : (
            <form onSubmit={issue} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <Label htmlFor="g-amount">Amount (KSh)</Label>
                <Input
                  id="g-amount" type="number" min="1" step="1" required
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {PRESETS.map((v) => (
                    <button
                      key={v} type="button" onClick={() => setAmount(String(v))}
                      className={`px-2.5 py-1 rounded-sm border text-xs transition-colors ${
                        Number(amount) === v ? "bg-foreground text-background border-foreground" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="g-to">Issued to <span className="text-muted-foreground/70">(optional)</span></Label>
                <Input id="g-to" type="email" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="customer@example.com" />
                <p className="text-xs text-muted-foreground mt-1">For your records — the card works for whoever has the code.</p>
              </div>
              <div>
                <Label htmlFor="g-note">Note</Label>
                <Input id="g-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Goodwill for the late delivery on ELF-XXXX" />
              </div>
              <div>
                <Label htmlFor="g-exp">Expires <span className="text-muted-foreground/70">(optional)</span></Label>
                <Input id="g-exp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          )}

          <div className="border-t px-6 py-4 flex gap-2 bg-muted/30">
            {issued ? (
              <Button className="flex-1" onClick={() => { setIssued(null); setOpen(false); }}>Done</Button>
            ) : (
              <>
                <Button onClick={issue} disabled={saving} className="flex-1 gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Issue card
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
