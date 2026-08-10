"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Grid from "@/components/admin/grid";
import CategorySheet, { type CategoryRow } from "./category-sheet";

/**
 * Categories, as a grid with a right-side editor — same shape as Products.
 *
 * The product count is the useful column here: it is what tells you whether
 * deleting a category will strand anything.
 */
export default function CategoriesPanel() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
      ]);
      const cats = await catRes.json();
      if (!catRes.ok) throw new Error(cats.error || "Could not load categories");
      const prods = await prodRes.json().catch(() => ({ products: [] }));

      // Count by id where the product is properly linked, falling back to the
      // name so unlinked legacy rows still show up somewhere.
      const byId = new Map<string, number>();
      const byName = new Map<string, number>();
      for (const p of prods.products ?? []) {
        if (p.category_id) byId.set(p.category_id, (byId.get(p.category_id) ?? 0) + 1);
        else if (p.category) {
          const key = String(p.category).toLowerCase();
          byName.set(key, (byName.get(key) ?? 0) + 1);
        }
      }

      setRows(
        (cats.categories ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? null,
          productCount:
            (byId.get(c.id) ?? 0) + (byName.get(String(c.name).toLowerCase()) ?? 0),
        }))
      );
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo<ColDef<CategoryRow>[]>(() => [
    {
      headerName: "Name",
      field: "name",
      pinned: "left",
      minWidth: 200,
      flex: 1,
      cellRenderer: (p: ICellRendererParams<CategoryRow>) => (
        <span className="font-medium">{p.value}</span>
      ),
    },
    {
      headerName: "Description",
      field: "description",
      minWidth: 260,
      flex: 2,
      valueFormatter: (p) => p.value || "—",
      cellClass: "text-muted-foreground",
    },
    {
      headerName: "Products",
      field: "productCount",
      filter: "agNumberColumnFilter",
      minWidth: 120,
      flex: 0,
      width: 120,
      type: "rightAligned",
      cellClass: "tabular-nums",
      valueGetter: (p) => p.data?.productCount ?? 0,
      cellRenderer: (p: ICellRendererParams<CategoryRow>) =>
        Number(p.value) === 0 ? (
          <span className="text-muted-foreground">0</span>
        ) : (
          <span className="tabular-nums">{p.value}</span>
        ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click a row to edit. Renaming is safe — products filed under a
            category follow the new name.
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setSheetOpen(true); }}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> New category
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
        exportName="elffie-categories"
        loading={loading}
        height={480}
        onRowClicked={(e) => e.data && (setEditing(e.data), setSheetOpen(true))}
        rowClass="cursor-pointer"
        overlayNoRowsTemplate={
          '<span class="text-sm text-muted-foreground">No categories yet — create the first one.</span>'
        }
      />

      <CategorySheet
        open={sheetOpen}
        category={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
