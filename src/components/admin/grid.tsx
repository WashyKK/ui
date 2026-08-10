"use client";

import { useEffect, useMemo, useState } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from "ag-grid-community";

/**
 * AG Grid Community (MIT), themed to the Machine Shop palette.
 *
 * Community covers everything the admin needs: sorting, text/number filters,
 * column pinning ("anchoring"), resizing, reordering, row selection, pagination
 * and CSV export. The Enterprise-only pieces — set filters, the sidebar tool
 * panel, row grouping, Excel export — are not used, so no licence key is
 * required and the console stays quiet.
 *
 * Column show/hide is done with our own popover below rather than Enterprise's
 * tool panel, driven through the same grid API.
 */
ModuleRegistry.registerModules([AllCommunityModule]);

/** Reads the design tokens so the grid inherits the palette rather than restating it. */
function tokens() {
  if (typeof window === "undefined") return null;
  const s = getComputedStyle(document.documentElement);
  const hsl = (name: string) => {
    const raw = s.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : undefined;
  };
  return {
    background: hsl("--background"),
    foreground: hsl("--foreground"),
    border: hsl("--border"),
    muted: hsl("--muted"),
    mutedForeground: hsl("--muted-foreground"),
    accent: hsl("--foreground"),
    radius: s.getPropertyValue("--radius").trim() || "2px",
  };
}

export const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  // Community's floating filters; the Enterprise set filter is not used.
  floatingFilter: false,
  minWidth: 90,
  flex: 1,
};

interface GridProps<T> extends Omit<AgGridReactProps<T>, "theme"> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  /** Filename stem for the CSV export button. */
  exportName?: string;
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  height?: number | string;
}

export default function Grid<T>({
  rowData, columnDefs, exportName = "export", toolbarLeft, toolbarRight,
  height = 560, ...rest
}: GridProps<T>) {
  const [api, setApi] = useState<GridApi<T> | null>(null);
  const [quick, setQuick] = useState("");
  const [dark, setDark] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [floating, setFloating] = useState(false);

  // The grid renders in whichever theme the page is in; track it so the two
  // never disagree.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const theme = useMemo(() => {
    const t = tokens();
    const base = themeQuartz.withParams({
      accentColor: t?.accent ?? "#1a1c1f",
      backgroundColor: t?.background ?? "#ffffff",
      foregroundColor: t?.foreground ?? "#1a1c1f",
      borderColor: t?.border ?? "#e3e5e8",
      chromeBackgroundColor: t?.muted ?? "#f2f3f5",
      headerBackgroundColor: t?.muted ?? "#f2f3f5",
      headerTextColor: t?.mutedForeground ?? "#8a8f94",
      // Match the catalogue's near-square corners and dense type.
      borderRadius: 2,
      wrapperBorderRadius: 2,
      fontFamily: "var(--font-sans), system-ui, sans-serif",
      headerFontSize: 11,
      headerFontWeight: 500,
      fontSize: 13,
      rowHeight: 40,
      headerHeight: 40,
      cellHorizontalPadding: 12,
      oddRowBackgroundColor: "transparent",
    });
    return dark ? base.withPart(colorSchemeDark) : base;
  }, [dark]);

  const onGridReady = (e: GridReadyEvent<T>) => {
    setApi(e.api);
    rest.onGridReady?.(e);
  };

  const toggleColumn = (field: string) => {
    setHidden((cur) => {
      const next = new Set(cur);
      const nowHidden = !next.has(field);
      nowHidden ? next.add(field) : next.delete(field);
      api?.setColumnsVisible([field], !nowHidden);
      return next;
    });
  };

  const columnsForToggle = columnDefs.filter(
    (c) => c.field && c.headerName !== ""
  ) as (ColDef<T> & { field: string })[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolbarLeft}

        <input
          value={quick}
          onChange={(e) => {
            setQuick(e.target.value);
            api?.setGridOption("quickFilterText", e.target.value);
          }}
          placeholder="Search all columns"
          aria-label="Search all columns"
          className="h-9 flex-1 min-w-[180px] rounded-sm border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <GridButton
          active={floating}
          onClick={() => {
            const next = !floating;
            setFloating(next);
            // DEFAULT_COL_DEF is deliberately untyped-generic; cast to the
            // grid's own ColDef<T> rather than widening the shared constant.
            api?.setGridOption("defaultColDef", {
              ...DEFAULT_COL_DEF,
              floatingFilter: next,
            } as ColDef<T>);
          }}
        >
          Filters
        </GridButton>

        <div className="relative">
          <GridButton active={showColumns || hidden.size > 0} onClick={() => setShowColumns((v) => !v)}>
            Columns{hidden.size ? ` (${columnsForToggle.length - hidden.size})` : ""}
          </GridButton>
          {showColumns && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColumns(false)} />
              <div className="absolute right-0 top-10 z-50 w-56 max-h-72 overflow-y-auto rounded-sm border bg-popover shadow-lg p-1.5">
                {columnsForToggle.map((c) => (
                  <label
                    key={c.field}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!hidden.has(c.field)}
                      onChange={() => toggleColumn(c.field)}
                      className="h-3.5 w-3.5 rounded-sm"
                    />
                    {c.headerName ?? c.field}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <GridButton onClick={() => api?.exportDataAsCsv({ fileName: `${exportName}.csv` })}>
          CSV
        </GridButton>

        {toolbarRight}
      </div>

      <div style={{ height, width: "100%" }}>
        <AgGridReact<T>
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100]}
          animateRows={false}
          suppressCellFocus
          {...rest}
          onGridReady={onGridReady}
        />
      </div>
    </div>
  );
}

function GridButton({
  children, onClick, active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-sm border text-xs transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
