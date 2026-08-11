"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Users } from "lucide-react";
import Grid from "@/components/admin/grid";

interface CustomerRow {
  email: string;
  name: string | null;
  registered: boolean;
  createdAt: string | null;
  lastSignIn: string | null;
  orders: number;
  paidOrders: number;
  lifetimeKes: number;
  lastOrderAt: string | null;
  phone: string | null;
  company: string | null;
  environment: string | null;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border p-4">
      <p className="label-micro text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

/**
 * Everyone who has bought or registered — including guests.
 *
 * The People tab is about staff access. This is about customers, and it counts
 * the ones with no account at all, whose only trace is an email on an order.
 */
export default function CustomersPanel() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load customers");
      setRows(data.customers ?? []);
      setSummary(data.summary ?? null);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo<ColDef<CustomerRow>[]>(() => [
    {
      headerName: "Customer",
      field: "email",
      pinned: "left",
      minWidth: 250,
      flex: 2,
      cellRenderer: (p: ICellRendererParams<CustomerRow>) => {
        const c = p.data;
        if (!c) return null;
        return (
          <span className="block leading-tight py-1.5">
            {c.name && <span className="block font-medium truncate">{c.name}</span>}
            <span className="block text-xs text-muted-foreground truncate">{c.email}</span>
          </span>
        );
      },
    },
    {
      headerName: "Account",
      field: "registered",
      minWidth: 120,
      valueGetter: (p) => (p.data?.registered ? "Registered" : "Guest"),
      cellRenderer: (p: ICellRendererParams<CustomerRow>) =>
        p.data?.registered ? (
          <span className="text-xs">Registered</span>
        ) : (
          <span
            className="text-[10px] uppercase tracking-wide border rounded-sm px-1.5 py-0.5 text-muted-foreground"
            title="Bought without creating an account"
          >
            Guest
          </span>
        ),
    },
    { headerName: "Company", field: "company", minWidth: 150, valueFormatter: (p) => p.value || "—" },
    { headerName: "Phone", field: "phone", minWidth: 130, valueFormatter: (p) => p.value ? `+${p.value}` : "—", cellClass: "font-mono text-[12px]" },
    {
      headerName: "Orders",
      field: "orders",
      filter: "agNumberColumnFilter",
      minWidth: 110, width: 110, flex: 0,
      type: "rightAligned",
      cellClass: "tabular-nums",
      cellRenderer: (p: ICellRendererParams<CustomerRow>) => {
        const c = p.data;
        if (!c) return null;
        // Paid vs placed: an abandoned pending order is not a purchase.
        return (
          <span className="tabular-nums">
            {c.paidOrders}
            {c.orders > c.paidOrders && (
              <span className="text-muted-foreground text-xs"> /{c.orders}</span>
            )}
          </span>
        );
      },
    },
    {
      headerName: "Lifetime",
      field: "lifetimeKes",
      filter: "agNumberColumnFilter",
      minWidth: 140, width: 140, flex: 0,
      type: "rightAligned",
      cellClass: "tabular-nums",
      valueGetter: (p) => Number(p.data?.lifetimeKes ?? 0),
      valueFormatter: (p) => (Number(p.value) > 0 ? `KSh ${Number(p.value).toLocaleString()}` : "—"),
    },
    { headerName: "Last order", field: "lastOrderAt", minWidth: 130, valueFormatter: (p) => fmtDate(p.value) },
    { headerName: "Joined", field: "createdAt", minWidth: 120, valueFormatter: (p) => fmtDate(p.value), hide: true },
    { headerName: "Last sign in", field: "lastSignIn", minWidth: 130, valueFormatter: (p) => fmtDate(p.value), hide: true },
    {
      headerName: "Data",
      field: "environment",
      minWidth: 100,
      valueFormatter: (p) => p.value || "—",
      cellRenderer: (p: ICellRendererParams<CustomerRow>) =>
        p.value === "test" ? (
          <span className="text-[10px] uppercase tracking-wide border rounded-sm px-1 py-0.5 text-muted-foreground">
            test
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{p.value ?? "—"}</span>
        ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everyone who has registered or bought — including guests who never made
          an account. Sorted by what they have spent.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="People" value={String(summary.total)} />
          <Stat label="Bought" value={String(summary.buyers)} hint="at least one paid order" />
          <Stat label="Guests" value={String(summary.guests)} hint="no account" />
          <Stat
            label="Lifetime value"
            value={`KSh ${Math.round(summary.lifetimeKes).toLocaleString()}`}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <Grid
        rowData={rows}
        columnDefs={columns}
        exportName="elffie-customers"
        loading={loading}
        height={520}
        overlayNoRowsTemplate={
          '<span class="text-sm text-muted-foreground">Nobody has registered or ordered yet.</span>'
        }
      />
    </div>
  );
}
