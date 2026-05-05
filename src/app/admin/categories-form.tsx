"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/confirm-dialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function CategoriesForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ text: data.error || "Failed to create category", ok: false });
      return;
    }
    setMessage({ text: `"${name}" created.`, ok: true });
    setName(""); setDescription("");
    load();
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    if (res.ok) { setEditingId(null); load(); }
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    await fetch(`/api/categories/${pendingDelete.id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <div className="space-y-8">
      {/* Create */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Create Category</h2>
        <form onSubmit={handleCreate} className="space-y-3 max-w-sm">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Humanoid Robots"
              required
            />
          </div>
          <div>
            <Label htmlFor="cat-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description…"
            />
          </div>
          <Button type="submit">Add Category</Button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </div>

      {/* List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All Categories</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet. Create one above.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-t">
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                      ) : (
                        <span className="font-medium">{cat.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {editingId === cat.id ? (
                        <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8" placeholder="Description…" />
                      ) : (
                        cat.description || "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(cat.id)} className="gap-1 h-7 px-2">
                            <Check className="h-3 w-3" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 px-2">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(cat)} className="gap-1 h-7 px-2">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setPendingDelete(cat)} className="gap-1 h-7 px-2">
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
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
        title="Delete category?"
        description={`"${pendingDelete?.name}" will be removed. Products using this category will keep their existing value but won't appear in the selector.`}
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setPendingDelete(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}
