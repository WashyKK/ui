"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  parentId?: string | null;
  depth?: number;
  path?: string;
  productCount?: number;
  childCount?: number;
}

interface CategorySheetProps {
  open: boolean;
  /** null = create, a row = edit. */
  category: CategoryRow | null;
  /** Every category, in tree order — the parent picker's options. */
  tree: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}

export default function CategorySheet({
  open, category, tree, onClose, onSaved,
}: CategorySheetProps) {
  const editing = Boolean(category);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setParentId(category?.parentId ?? "");
    setError(null);
    setConfirmDelete(false);
  }, [open, category]);

  // A category cannot be moved inside itself. The database refuses it too, but
  // offering the option and then erroring is a worse experience than not
  // offering it.
  const descendantIds = (() => {
    if (!category) return new Set<string>();
    const out = new Set<string>([category.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const node of tree) {
        if (node.parentId && out.has(node.parentId) && !out.has(node.id)) {
          out.add(node.id);
          grew = true;
        }
      }
    }
    return out;
  })();

  const parentOptions = tree.filter((n) => !descendantIds.has(n.id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editing ? `/api/categories/${category!.id}` : "/api/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description, parentId: parentId || null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${category!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Delete failed");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const inUse = (category?.productCount ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{editing ? "Edit category" : "New category"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <Label htmlFor="c-parent">Sits under</Label>
            <select
              id="c-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full h-10 rounded-sm border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Top level —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {"\u00A0\u00A0".repeat(c.depth ?? 0)}
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {parentId
                ? `Will appear as ${parentOptions.find((c) => c.id === parentId)?.path ?? ""} › ${name || "…"}`
                : "A top-level category. Choose a parent to make this a sub-category."}
            </p>
          </div>

          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Proximity sensors"
            />
            {editing && inUse && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Renaming is safe — the {category!.productCount} product
                {category!.productCount === 1 ? "" : "s"} filed here follow the
                new name automatically.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="c-description">Description</Label>
            <textarea
              id="c-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What belongs in this category?"
              className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="flex gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{error}
            </p>
          )}
        </form>

        <div className="border-t px-6 py-4 space-y-3 bg-muted/30">
          {confirmDelete ? (
            <div className="space-y-2.5">
              <p className="text-sm">
                Delete <span className="font-medium">{category?.name}</span>?
              </p>
              {(category?.childCount ?? 0) > 0 && (
                <p className="text-xs text-destructive">
                  This has {category!.childCount} sub-categor
                  {category!.childCount === 1 ? "y" : "ies"}. Move or delete those
                  first — the delete will be refused otherwise.
                </p>
              )}
              {inUse && (
                <p className="text-xs text-muted-foreground">
                  {category!.productCount} product
                  {category!.productCount === 1 ? "" : "s"} use this. They keep
                  the category name as plain text but will no longer follow
                  renames, and it disappears from the selector.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="destructive" size="sm" className="flex-1"
                  onClick={remove} disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={submit} disabled={saving} className="flex-1 gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create category"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              {editing && (
                <Button
                  variant="outline" size="icon"
                  aria-label="Delete category"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
