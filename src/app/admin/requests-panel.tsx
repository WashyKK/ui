"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Loader2, PackageSearch } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Grid from "@/components/admin/grid";

/** The lifecycle of a request for something not in the catalogue. */
const STATUSES = [
  { id: "new", label: "New" },
  { id: "sourcing", label: "Sourcing" },
  { id: "quoted", label: "Quoted" },
  { id: "ordered", label: "Ordered" },
  { id: "declined", label: "Can't source" },
  { id: "closed", label: "Closed" },
] as const;

const OPEN = new Set(["new", "sourcing", "quoted"]);
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function RequestsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState("new");
  const [quotedKes, setQuotedKes] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/requests", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not load requests");
      setReady(d.ready !== false);
      setRows(d.requests ?? []);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openRequest = (row: any) => {
    setEditing(row);
    setStatus(row.status ?? "new");
    setQuotedKes(row.quoted_minor ? String(Number(row.quoted_minor) / 100) : "");
    setLeadTime(row.lead_time ?? "");
    setNotes(row.admin_notes ?? "");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id, status,
          quotedKes: quotedKes === "" ? null : Number(quotedKes),
          leadTime, adminNotes: notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save");
      setEditing(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openCount = rows.filter((r) => OPEN.has(r.status ?? "new")).length;

  const columns = useMemo<ColDef<any>[]>(() => [
    {
      headerName: "What they need", field: "part_number", pinned: "left", minWidth: 240, flex: 2,
      valueGetter: (p) => p.data?.part_number || p.data?.subject || p.data?.message?.slice(0, 60) || "—",
      cellRenderer: (p: ICellRendererParams) => (
        <span className="block py-1.5 leading-tight">
          <span className="block truncate">{p.value}</span>
          <span className="block text-xs text-muted-foreground truncate">{p.data?.email}</span>
        </span>
      ),
    },
    {
      headerName: "Status", field: "status", minWidth: 130,
      valueGetter: (p) => STATUSES.find((s) => s.id === (p.data?.status ?? "new"))?.label ?? "New",
      cellRenderer: (p: ICellRendererParams) => {
        const st = p.data?.status ?? "new";
        return OPEN.has(st)
          ? <span className="text-[10px] uppercase tracking-wide border rounded-sm px-1.5 py-0.5">{p.value}</span>
          : <span className="text-xs text-muted-foreground">{p.value}</span>;
      },
    },
    { headerName: "Qty", field: "quantity", minWidth: 80, width: 80, flex: 0, type: "rightAligned", cellClass: "tabular-nums", valueFormatter: (p) => p.value ?? "—" },
    { headerName: "Company", field: "company", minWidth: 150, valueFormatter: (p) => p.value || "—" },
    {
      headerName: "Quoted", field: "quoted_minor", minWidth: 120, type: "rightAligned", cellClass: "tabular-nums",
      valueGetter: (p) => Number(p.data?.quoted_minor ?? 0),
      valueFormatter: (p) => (p.value ? `KSh ${(p.value / 100).toLocaleString()}` : "—"),
    },
    { headerName: "Needed by", field: "needed_by", minWidth: 120, valueFormatter: (p) => fmt(p.value) },
    { headerName: "Received", field: "created_at", minWidth: 120, valueFormatter: (p) => fmt(p.value) },
  ], []);

  if (!ready) {
    return (
      <div className="border p-6 space-y-2">
        <h2 className="text-lg font-semibold">Requests</h2>
        <p className="text-sm text-muted-foreground">
          Not set up yet — <code className="rounded-sm bg-muted px-1">supabase/sourcing_requests.sql</code> has not been applied.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Requests</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          People asking for parts you do not stock. {openCount > 0
            ? `${openCount} still open — each one is a sale waiting on a reply.`
            : "Nothing open."}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-3 py-2">{error}</p>
      )}

      <Grid
        rowData={rows} columnDefs={columns} exportName="elffie-requests"
        loading={loading} height={520}
        onRowClicked={(e) => e.data && openRequest(e.data)}
        rowClass="cursor-pointer"
        overlayNoRowsTemplate={'<span class="text-sm text-muted-foreground">No requests yet.</span>'}
      />

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Request</SheetTitle>
            <p className="text-xs text-muted-foreground">{editing?.email}</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="rounded-sm border p-3 space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <PackageSearch className="h-4 w-4 text-muted-foreground" />
                {editing?.part_number || editing?.subject || "Enquiry"}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{editing?.message}</p>
              <p className="text-xs text-muted-foreground pt-1">
                {editing?.name}
                {editing?.company ? ` · ${editing.company}` : ""}
                {editing?.phone ? ` · ${editing.phone}` : ""}
                {editing?.quantity ? ` · qty ${editing.quantity}` : ""}
                {editing?.needed_by ? ` · needed by ${fmt(editing.needed_by)}` : ""}
              </p>
            </div>

            <div>
              <Label>Status</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.id} type="button" onClick={() => setStatus(s.id)}
                    className={`px-2 py-1.5 rounded-sm border text-xs transition-colors ${
                      status === s.id ? "bg-foreground text-background border-foreground" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-quote">Quoted (KSh)</Label>
                <Input id="r-quote" type="number" min="0" value={quotedKes} onChange={(e) => setQuotedKes(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-lead">Lead time</Label>
                <Input id="r-lead" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="2–3 weeks" />
              </div>
            </div>

            <div>
              <Label htmlFor="r-notes">Notes</Label>
              <textarea
                id="r-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Which supplier, what they said, what it lands at."
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <a
              href={`mailto:${editing?.email}?subject=${encodeURIComponent(`Your request — ${editing?.part_number || "Elffie Robotics"}`)}`}
              className="inline-block text-sm underline underline-offset-2 hover:text-foreground text-muted-foreground"
            >
              Reply by email
            </a>
          </div>

          <div className="border-t px-6 py-4 flex gap-2 bg-muted/30">
            <Button onClick={save} disabled={saving} className="flex-1 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
