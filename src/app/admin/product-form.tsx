"use client";

import React, { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/confirm-dialog";
import { FileText, Upload, X } from "lucide-react";

export default function AdminForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [datasheetUploading, setDatasheetUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-row datasheet upload state
  const [rowDatasheetFile, setRowDatasheetFile] = useState<File | null>(null);
  const [rowDatasheetUploading, setRowDatasheetUploading] = useState(false);

  const uploadPdf = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/products/upload-datasheet", { method: "POST", body: form });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Upload failed");
    }
    const { url } = await res.json();
    return url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    let datasheetUrl: string | undefined;
    if (datasheetFile) {
      setDatasheetUploading(true);
      try {
        datasheetUrl = await uploadPdf(datasheetFile) ?? undefined;
      } catch (err: any) {
        setMessage(err.message || "Datasheet upload failed");
        setDatasheetUploading(false);
        return;
      }
      setDatasheetUploading(false);
    }

    const payload = {
      name,
      description,
      price: Number(price),
      stock: Number(stock || 0),
      category,
      imageUrl,
      datasheetUrl,
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMessage("Product created successfully.");
      setName(""); setDescription(""); setPrice(""); setStock("");
      setCategory(""); setImageUrl(""); setDatasheetFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        datasheetUrl = await uploadPdf(rowDatasheetFile);
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
    if (res.ok) {
      setEditingId(null);
      load();
    }
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin — Create Product</h1>
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
          <Label htmlFor="price">Price</Label>
          <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
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
              ref={fileInputRef}
              id="datasheet"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setDatasheetFile(e.target.files?.[0] ?? null)}
            />
            {datasheetFile && (
              <button
                type="button"
                onClick={() => { setDatasheetFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
        </div>
        <Button type="submit" disabled={datasheetUploading}>
          {datasheetUploading ? "Uploading datasheet…" : "Create Product"}
        </Button>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Manage Products</h2>
        {loading ? (
          <p>Loading…</p>
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
                      {editingId === p.id ? (
                        <Input defaultValue={p.name} onChange={(e) => (p.name = e.target.value)} />
                      ) : <span>{p.name}</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <Input type="number" defaultValue={p.price} onChange={(e) => (p.price = e.target.value)} />
                      ) : <>${" "}{Number(p.price).toFixed(2)}</>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <Input type="number" defaultValue={p.stock} onChange={(e) => (p.stock = e.target.value)} />
                      ) : <>{p.stock}</>}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <Input defaultValue={p.category || ""} onChange={(e) => (p.category = e.target.value)} />
                      ) : <>{p.category}</>}
                    </td>
                    <td className="py-2 pr-4 max-w-[180px]">
                      {editingId === p.id ? (
                        <Input defaultValue={p.image_url || ""} onChange={(e) => (p.image_url = e.target.value)} />
                      ) : (
                        <span className="break-all text-muted-foreground text-xs">{p.image_url || "—"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === p.id ? (
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground border border-dashed rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors w-fit">
                            <Upload className="h-3 w-3" />
                            {rowDatasheetFile ? rowDatasheetFile.name : "Replace PDF…"}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="sr-only"
                              onChange={(e) => setRowDatasheetFile(e.target.files?.[0] ?? null)}
                            />
                          </label>
                          {p.datasheet_url && !rowDatasheetFile && (
                            <a href={p.datasheet_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-accent underline underline-offset-2">
                              <FileText className="h-3 w-3" /> Current
                            </a>
                          )}
                        </div>
                      ) : (
                        p.datasheet_url ? (
                          <a href={p.datasheet_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-accent underline underline-offset-2">
                            <FileText className="h-3 w-3" /> View
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>
                      )}
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
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setPendingDelete(null)}
        onConfirm={doRemove}
      />
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You will be logged out of the admin session."
        confirmLabel="Logout"
        variant="destructive"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={logout}
      />
    </div>
  );
}
