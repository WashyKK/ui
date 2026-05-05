"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/confirm-dialog";
import { FileText, Upload, X, ImageIcon } from "lucide-react";

interface Category { id: string; name: string; }

// ── shared helpers ────────────────────────────────────────────────────────────

async function uploadFile(endpoint: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}

// ── ImageUpload sub-component ─────────────────────────────────────────────────

function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile("/api/products/upload-image", file);
      setPreview(url);
      onChange(url);
    } catch (e: any) {
      alert(e.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {/* Tab toggle */}
      <div className="flex rounded-md border overflow-hidden text-xs w-fit">
        {(["upload", "url"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 capitalize transition-colors ${
              tab === t ? "bg-accent text-white" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {t === "upload" ? "Upload photo" : "Paste URL"}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input hover:border-accent transition-colors cursor-pointer h-36 bg-gray-50 dark:bg-zinc-800/50"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-6 w-6 animate-bounce" />
              <span className="text-xs">Uploading…</span>
            </div>
          ) : preview ? (
            <>
              <div className="relative w-full h-full">
                <Image src={preview} alt="Preview" fill className="object-cover rounded-lg" />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreview(""); onChange(""); }}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground pointer-events-none">
              <ImageIcon className="h-8 w-8 opacity-30" />
              <span className="text-xs font-medium">Click or drag image here</span>
              <span className="text-[10px]">JPEG, PNG, WebP, GIF · max 10 MB</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input
            value={value}
            onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
            placeholder="https://…"
          />
          {preview && (
            <div className="relative h-24 w-24 rounded-lg overflow-hidden border bg-gray-50 dark:bg-zinc-800">
              <Image src={preview} alt="Preview" fill className="object-cover" onError={() => setPreview("")} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── main form ─────────────────────────────────────────────────────────────────

export default function AdminForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [datasheetUploading, setDatasheetUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const datasheetInputRef = useRef<HTMLInputElement>(null);
  const [rowDatasheetFile, setRowDatasheetFile] = useState<File | null>(null);
  const [rowDatasheetUploading, setRowDatasheetUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    let datasheetUrl: string | undefined;
    if (datasheetFile) {
      setDatasheetUploading(true);
      try {
        datasheetUrl = await uploadFile("/api/products/upload-datasheet", datasheetFile);
      } catch (err: any) {
        setMessage(err.message || "Datasheet upload failed");
        setDatasheetUploading(false);
        return;
      }
      setDatasheetUploading(false);
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description,
          price: Number(price),
          stock: Number(stock || 0),
          category,
          imageUrl,
          datasheetUrl,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage("Product created successfully.");
      setName(""); setDescription(""); setPrice(""); setStock("");
      setCategory(""); setImageUrl(""); setDatasheetFile(null);
      if (datasheetInputRef.current) datasheetInputRef.current.value = "";
      load();
    } catch (e: any) {
      setMessage(e.message || "Failed to create product.");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();
      setList(data.products || []);
    } finally {
      setLoading(false);
    }
  };

  const askRemove = (id: string, name?: string) => setPendingDelete({ id, name });
  const doRemove = async () => {
    if (!pendingDelete) return;
    const res = await fetch(`/api/products/${pendingDelete.id}`, { method: "DELETE" });
    if (res.ok) setList((cur) => cur.filter((p) => p.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const patch = async (p: any) => {
    let datasheetUrl = p.datasheet_url;
    if (rowDatasheetFile) {
      setRowDatasheetUploading(true);
      try {
        datasheetUrl = await uploadFile("/api/products/upload-datasheet", rowDatasheetFile);
      } catch (err: any) {
        alert(err.message || "Datasheet upload failed");
        setRowDatasheetUploading(false);
        return;
      }
      setRowDatasheetUploading(false);
      setRowDatasheetFile(null);
    }
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        description: p.description,
        price: Number(p.price),
        stock: Number(p.stock),
        category: p.category,
        imageUrl: p.image_url,
        datasheetUrl,
      }),
    });
    if (res.ok) { setEditingId(null); load(); }
  };

  useEffect(() => {
    load();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create Product</h1>
        <Button variant="outline" onClick={() => setConfirmLogout(true)}>Logout</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Select a category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Product Image</Label>
          <div className="mt-1">
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
        </div>
        <div>
          <Label htmlFor="datasheet">Datasheet (PDF)</Label>
          <div className="mt-1">
            <label
              htmlFor="datasheet"
              className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-md border border-dashed border-input hover:border-accent hover:text-accent transition-colors text-sm text-muted-foreground"
            >
              <Upload className="h-4 w-4" />
              {datasheetFile ? datasheetFile.name : "Choose PDF file…"}
            </label>
            <input
              ref={datasheetInputRef}
              id="datasheet"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setDatasheetFile(e.target.files?.[0] ?? null)}
            />
            {datasheetFile && (
              <button
                type="button"
                onClick={() => { setDatasheetFile(null); if (datasheetInputRef.current) datasheetInputRef.current.value = ""; }}
                className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
        </div>
        <Button type="submit" disabled={datasheetUploading}>
          {datasheetUploading ? "Uploading…" : "Create Product"}
        </Button>
      </form>

      {message && (
        <p className={`mt-4 text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      {/* Manage table */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Manage Products</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Image</th>
                  <th className="py-2 pr-4">Datasheet</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b align-top">
                    <td className="py-2 pr-4">
                      {editingId === p.id
                        ? <Input defaultValue={p.name} onChange={(e) => (p.name = e.target.value)} />
                        : <span className="font-medium">{p.name}</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id
                        ? <Input type="number" defaultValue={p.price} onChange={(e) => (p.price = e.target.value)} className="w-24" />
                        : <>${Number(p.price).toFixed(2)}</>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id
                        ? <Input type="number" defaultValue={p.stock} onChange={(e) => (p.stock = e.target.value)} className="w-20" />
                        : <>{p.stock}</>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <select
                          defaultValue={p.category || ""}
                          onChange={(e) => (p.category = e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— none —</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      ) : <>{p.category || "—"}</>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <div className="space-y-1 w-48">
                          <ImageUpload
                            value={p.image_url || ""}
                            onChange={(url) => (p.image_url = url)}
                          />
                        </div>
                      ) : p.image_url ? (
                        <div className="relative h-12 w-12 rounded border overflow-hidden bg-gray-50">
                          <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground border border-dashed rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors w-fit">
                            <Upload className="h-3 w-3" />
                            {rowDatasheetFile ? rowDatasheetFile.name : "Replace PDF…"}
                            <input type="file" accept="application/pdf" className="sr-only"
                              onChange={(e) => setRowDatasheetFile(e.target.files?.[0] ?? null)} />
                          </label>
                          {p.datasheet_url && !rowDatasheetFile && (
                            <a href={p.datasheet_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-accent underline underline-offset-2">
                              <FileText className="h-3 w-3" /> Current
                            </a>
                          )}
                        </div>
                      ) : p.datasheet_url ? (
                        <a href={p.datasheet_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent underline underline-offset-2">
                          <FileText className="h-3 w-3" /> View
                        </a>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 flex gap-2">
                      {editingId === p.id ? (
                        <>
                          <Button size="sm" onClick={() => patch(p)} disabled={rowDatasheetUploading}>
                            {rowDatasheetUploading ? "Uploading…" : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setRowDatasheetFile(null); }}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => askRemove(p.id, p.name)}>Delete</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete product?"
        description={`This action cannot be undone.${pendingDelete?.name ? ` You are deleting "${pendingDelete?.name}".` : ""}`}
        confirmLabel="Delete" variant="destructive"
        onCancel={() => setPendingDelete(null)} onConfirm={doRemove}
      />
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You will be logged out of the admin session."
        confirmLabel="Logout" variant="destructive"
        onCancel={() => setConfirmLogout(false)} onConfirm={logout}
      />
    </div>
  );
}
