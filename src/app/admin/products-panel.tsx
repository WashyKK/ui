"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, EyeOff, FileText, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Grid from "@/components/admin/grid";
import ProductSheet, { type Category } from "./product-sheet";
import { STATUS_META, statusOf } from "@/lib/product-status";

/**
 * The Products tab.
 *
 * Was a full-page create form with the product table pushed below the fold.
 * Now the table is the page — every column, sortable, filterable, with the
 * name column pinned so it stays anchored while you scroll the specs
 * horizontally. Creating and editing both happen in a right-side sheet.
 */
export default function ProductsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?all=1", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load products");
      setRows(data.products ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) =>
        setCategories(
          (d.categories ?? []).map((c: any) => ({
            id: c.id, name: c.name, depth: c.depth ?? 0, path: c.path ?? c.name,
          }))
        )
      )
      .catch(() => {});
  }, [load]);

  /** One click on or off the shelf, without opening the sheet. */
  const toggleListed = useCallback(async (row: any) => {
    const next = statusOf(row) === "active" ? "unlisted" : "active";
    // Optimistic: the grid should feel instant for a one-click action.
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      const res = await fetch(`/api/products/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not update");
      setError(null);
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }, [load]);

  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setSheetOpen(true); };

  const columns = useMemo<ColDef<any>[]>(() => [
    {
      headerName: "",
      field: "image_url",
      width: 60,
      minWidth: 60,
      maxWidth: 60,
      flex: 0,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: "left",
      cellRenderer: (p: ICellRendererParams) =>
        p.value ? (
          <div className="relative h-7 w-7 my-1.5 rounded-sm border overflow-hidden bg-muted">
            <Image src={p.value} alt="" fill className="object-contain" sizes="28px" />
          </div>
        ) : (
          <div className="h-7 w-7 my-1.5 rounded-sm border grid place-items-center bg-muted">
            <Package className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
    },
    {
      headerName: "Name",
      field: "name",
      // Anchored: the identifying column stays put while the specs scroll.
      pinned: "left",
      minWidth: 200,
      flex: 2,
      cellRenderer: (p: ICellRendererParams) => (
        <span className="font-medium">{p.value}</span>
      ),
    },
    {
      headerName: "Part no.",
      field: "mpn",
      minWidth: 130,
      cellClass: "font-mono text-[12px]",
      valueFormatter: (p) => p.value || "—",
    },
    {
      headerName: "Manufacturer",
      field: "manufacturer",
      minWidth: 130,
      valueFormatter: (p) => p.value || "—",
    },
    {
      headerName: "Stock code",
      field: "sku",
      minWidth: 120,
      cellClass: "font-mono text-[12px]",
      valueFormatter: (p) => p.value || "—",
      hide: true,
    },
    {
      headerName: "Category",
      field: "category",
      minWidth: 130,
      valueFormatter: (p) => p.value || "—",
      cellRenderer: (p: ICellRendererParams) =>
        p.data?.category && !p.data?.category_id ? (
          // Surfaced because it is invisible otherwise: this product carries a
          // category name that matches no row in `categories`, so a rename will
          // not follow it.
          <span
            className="inline-flex items-center gap-1.5"
            title="Not linked to a category record — renaming that category will not update this product"
          >
            {p.data.category}
            <span className="text-[10px] text-muted-foreground border rounded-sm px-1">
              unlinked
            </span>
          </span>
        ) : (
          p.value || "—"
        ),
    },
    {
      headerName: "Price",
      field: "price",
      filter: "agNumberColumnFilter",
      minWidth: 100,
      type: "rightAligned",
      cellClass: "tabular-nums",
      valueGetter: (p) => Number(p.data?.price ?? 0),
      valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`,
    },
    {
      headerName: "Stock",
      field: "stock",
      filter: "agNumberColumnFilter",
      minWidth: 100,
      type: "rightAligned",
      valueGetter: (p) => Number(p.data?.stock ?? 0),
      cellRenderer: (p: ICellRendererParams) => {
        const n = Number(p.value ?? 0);
        return (
          <span className={`tabular-nums ${n === 0 ? "text-destructive" : ""}`}>
            {n}
            {n === 0 && <span className="ml-1.5 text-[10px]">out</span>}
            {n > 0 && n <= 5 && <span className="ml-1.5 text-[10px] text-muted-foreground">low</span>}
          </span>
        );
      },
    },
    {
      headerName: "Datasheet",
      field: "datasheet_url",
      minWidth: 110,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams) =>
        p.value ? (
          <a
            href={p.value}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
          >
            <FileText className="h-3 w-3" /> PDF
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      headerName: "Slug",
      field: "slug",
      minWidth: 160,
      cellClass: "font-mono text-[12px] text-muted-foreground",
      valueFormatter: (p) => p.value || "—",
      hide: true,
    },
    {
      headerName: "Listing",
      field: "status",
      minWidth: 130,
      valueGetter: (p) => STATUS_META[statusOf(p.data)].label,
      cellRenderer: (p: ICellRendererParams) => {
        const st = statusOf(p.data);
        if (st === "active") {
          return <span className="text-xs text-muted-foreground">Listed</span>;
        }
        return (
          <span
            className="text-[10px] uppercase tracking-wide border rounded-sm px-1.5 py-0.5"
            title={STATUS_META[st].description}
          >
            {STATUS_META[st].short}
          </span>
        );
      },
    },
    {
      headerName: "",
      colId: "quick",
      width: 120, minWidth: 120, flex: 0,
      sortable: false, filter: false, resizable: false,
      pinned: "right",
      cellRenderer: (p: ICellRendererParams) => {
        const row = p.data;
        if (!row) return null;
        const st = statusOf(row);
        if (st === "archived") {
          return <span className="text-xs text-muted-foreground">Archived</span>;
        }
        const listed = st === "active";
        return (
          <button
            onClick={(e) => { e.stopPropagation(); toggleListed(row); }}
            title={listed ? "Take off the catalogue — the direct link keeps working" : "Put back on the catalogue"}
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded-sm border text-xs hover:bg-muted transition-colors my-1"
          >
            {listed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {listed ? "Unlist" : "List"}
          </button>
        );
      },
    },
    {
      headerName: "Updated",
      field: "updated_at",
      minWidth: 120,
      valueFormatter: (p) =>
        p.value
          ? new Date(p.value).toLocaleDateString("en-KE", {
              day: "numeric", month: "short", year: "numeric",
            })
          : "—",
    },
  ], []);

  return (
    <div className="space-y-4">
      {/* Stacks on a phone: side by side, the button took half the width and
          wrung the description out into six lines. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click a row to edit it. Unlist takes something off the catalogue
            without touching its stock or its order history.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <Grid
        rowData={rows}
        columnDefs={columns}
        exportName="elffie-products"
        loading={loading}
        onRowClicked={(e) => e.data && openEdit(e.data)}
        getRowClass={(p) => (statusOf(p.data) === "active" ? "cursor-pointer" : "cursor-pointer opacity-60")}
        overlayNoRowsTemplate={
          '<span class="text-sm text-muted-foreground">No products yet — create the first one.</span>'
        }
      />

      <ProductSheet
        open={sheetOpen}
        product={editing}
        categories={categories}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
