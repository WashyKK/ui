"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { CornerDownRight, Plus } from "lucide-react";
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

      const all = (cats.categories ?? []) as any[];
      const childCounts = new Map<string, number>();
      for (const c of all) {
        if (c.parent_id) childCounts.set(c.parent_id, (childCounts.get(c.parent_id) ?? 0) + 1);
      }

      setRows(
        all.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? null,
          parentId: c.parent_id ?? null,
          depth: c.depth ?? 0,
          path: c.path ?? c.name,
          childCount: childCounts.get(c.id) ?? 0,
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
      headerName: "Category",
      field: "path",
      pinned: "left",
      minWidth: 280,
      flex: 2,
      // Sorting or filtering would scatter children away from their parents, so
      // the tree column does neither. The path column below is searchable.
      sortable: false,
      valueGetter: (p) => p.data?.path ?? p.data?.name ?? "",
      cellRenderer: (p: ICellRendererParams<CategoryRow>) => {
        const row = p.data;
        if (!row) return null;
        const depth = row.depth ?? 0;
        return (
          <span
            className="flex items-center gap-1.5"
            style={{ paddingLeft: depth * 18 }}
          >
            {depth > 0 && (
              <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className={depth === 0 ? "font-medium" : ""}>{row.name}</span>
            {(row.childCount ?? 0) > 0 && (
              <span className="text-[10px] text-muted-foreground border rounded-sm px-1">
                {row.childCount}
              </span>
            )}
          </span>
        );
      },
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
            Nest them as deep as you need — Motors › DC › Stepper. Click a row to
            edit or move it. Renaming is safe; products follow the new name.
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
        tree={rows}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
