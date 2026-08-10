"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload, { uploadFile } from "@/components/admin/image-upload";

export interface Category { id: string; name: string }

const field =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring";

interface ProductSheetProps {
  open: boolean;
  /** null = create, a row = edit. */
  product: any | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create and edit, in one right-side sheet.
 *
 * Replaces a full-page form stacked above the table, plus a second inline
 * row editor that mutated the row object in place (`p.name = e.target.value`)
 * and relied on the mutation surviving to the PATCH — which meant edits could
 * silently apply to stale data and never re-rendered while typing.
 *
 * Delete confirmation happens inside this sheet rather than a centred dialog,
 * so the admin never has two competing modal layers.
 */
export default function ProductSheet({
  open, product, categories, onClose, onSaved,
}: ProductSheetProps) {
  const editing = Boolean(product);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mpn, setMpn] = useState("");
  const [sku, setSku] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [existingDatasheet, setExistingDatasheet] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const datasheetRef = useRef<HTMLInputElement>(null);

  // Reset from the row every time the sheet opens, so a previous edit never
  // leaks into the next one.
  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setPrice(product?.price != null ? String(product.price) : "");
    setStock(product?.stock != null ? String(product.stock) : "");
    setCategoryId(
      product?.category_id ??
        categories.find((c) => c.name === product?.category)?.id ??
        ""
    );
    setMpn(product?.mpn ?? "");
    setSku(product?.sku ?? "");
    setManufacturer(product?.manufacturer ?? "");
    setImageUrl(product?.image_url ?? "");
    setExistingDatasheet(product?.datasheet_url ?? null);
    setDatasheetFile(null);
    setError(null);
    setConfirmDelete(false);
    if (datasheetRef.current) datasheetRef.current.value = "";
  }, [open, product, categories]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let datasheetUrl = existingDatasheet ?? undefined;
      if (datasheetFile) {
        datasheetUrl = await uploadFile("/api/products/upload-datasheet", datasheetFile);
      }

      const body = {
        name: name.trim(),
        description,
        price: Number(price),
        stock: Number(stock || 0),
        categoryId: categoryId || null,
        category: categories.find((c) => c.id === categoryId)?.name ?? "",
        mpn, sku, manufacturer,
        imageUrl,
        datasheetUrl,
      };

      const res = await fetch(
        editing ? `/api/products/${product.id}` : "/api/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);

      // The API reports how many people were waiting on this part.
      if (data.notified > 0) {
        window.alert(
          `Saved. ${data.notified} ${data.notified === 1 ? "person was" : "people were"} ` +
          `waiting for this to come back in stock and have been emailed.`
        );
      }

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
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{editing ? "Edit product" : "New product"}</SheetTitle>
          {editing && (
            <p className="text-xs text-muted-foreground font-mono">
              {product.slug ?? product.id}
            </p>
          )}
        </SheetHeader>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-price">Price (USD)</Label>
              <Input
                id="p-price" type="number" step="0.01" min="0" required
                value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="p-stock">Stock</Label>
              <Input
                id="p-stock" type="number" min="0"
                value={stock} onChange={(e) => setStock(e.target.value)}
              />
              {editing && Number(product.stock) === 0 && Number(stock) > 0 && (
                <p className="text-xs text-signal mt-1">
                  Saving will email anyone waiting on this part.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-mpn">Manufacturer part no.</Label>
              <Input
                id="p-mpn" value={mpn} onChange={(e) => setMpn(e.target.value)}
                placeholder="17HS4401"
              />
              <p className="text-xs text-muted-foreground mt-1">What buyers search for.</p>
            </div>
            <div>
              <Label htmlFor="p-manufacturer">Manufacturer</Label>
              <Input
                id="p-manufacturer" value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)} placeholder="Omron"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-sku">Stock code</Label>
              <Input
                id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)}
                placeholder="Internal reference"
              />
            </div>
            <div>
              <Label htmlFor="p-category">Category</Label>
              <select
                id="p-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`${field} h-10 py-0`}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="p-description">Description</Label>
            <textarea
              id="p-description"
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Markdown supported.\n\n**Bold**, *italic*, `code`, [links](https://…)\n- bullet lists\n## headings"}
              className={field}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Markdown. Raw HTML is escaped, not rendered.
            </p>
          </div>

          <div>
            <Label>Product image</Label>
            <div className="mt-1.5">
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
          </div>

          <div>
            <Label htmlFor="p-datasheet">Datasheet (PDF)</Label>
            <div className="mt-1.5 space-y-1.5">
              <label
                htmlFor="p-datasheet"
                className="flex items-center gap-2 cursor-pointer w-fit px-3 py-2 rounded-sm border border-dashed border-input hover:border-graphite transition-colors text-sm text-muted-foreground"
              >
                <Upload className="h-4 w-4" />
                {datasheetFile
                  ? datasheetFile.name
                  : existingDatasheet
                    ? "Replace PDF…"
                    : "Choose PDF…"}
              </label>
              <input
                ref={datasheetRef}
                id="p-datasheet"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => setDatasheetFile(e.target.files?.[0] ?? null)}
              />

              {datasheetFile ? (
                <button
                  type="button"
                  onClick={() => {
                    setDatasheetFile(null);
                    if (datasheetRef.current) datasheetRef.current.value = "";
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Cancel replacement
                </button>
              ) : existingDatasheet ? (
                <a
                  href={existingDatasheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs underline underline-offset-2 hover:text-foreground w-fit"
                >
                  <FileText className="h-3 w-3" /> View current datasheet
                </a>
              ) : null}
            </div>
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
                Delete <span className="font-medium">{product?.name}</span>? This cannot be undone.
              </p>
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
                {editing ? "Save changes" : "Create product"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              {editing && (
                <Button
                  variant="outline" size="icon"
                  aria-label="Delete product"
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
