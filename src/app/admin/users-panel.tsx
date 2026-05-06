"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldX, User, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  role: string | null;
  created_at: string;
  last_sign_in: string | null;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ user: UserRow; action: "grant" | "revoke" } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grantManager = async (user: UserRow) => {
    setWorking(user.id);
    await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, role: "store_manager" }),
    });
    setWorking(null);
    setConfirm(null);
    load();
  };

  const revokeManager = async (user: UserRow) => {
    setWorking(user.id);
    await fetch("/api/admin/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    setWorking(null);
    setConfirm(null);
    load();
  };

  const fmt = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Registered Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Appoint store managers who can create and edit products.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">No users have signed in yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last sign in</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatar ? (
                        <Image src={u.avatar} alt={u.name ?? u.email} width={28} height={28} className="rounded-full shrink-0" />
                      ) : (
                        <span className="h-7 w-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-accent" />
                        </span>
                      )}
                      <div className="min-w-0">
                        {u.name && <p className="font-medium truncate">{u.name}</p>}
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{u.provider}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(u.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(u.last_sign_in)}</td>
                  <td className="px-4 py-3">
                    {u.role === "store_manager" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900">
                        <ShieldCheck className="h-3 w-3" /> Manager
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Customer</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {working === u.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : u.role === "store_manager" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setConfirm({ user: u, action: "revoke" })}
                      >
                        <ShieldX className="h-3 w-3" /> Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7 px-2"
                        onClick={() => setConfirm({ user: u, action: "grant" })}
                      >
                        <ShieldCheck className="h-3 w-3" /> Make Manager
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === "grant" ? "Appoint store manager?" : "Revoke manager role?"}
        description={
          confirm?.action === "grant"
            ? `${confirm.user.email} will be able to create, edit, and delete products.`
            : `${confirm?.user.email} will lose product management access.`
        }
        confirmLabel={confirm?.action === "grant" ? "Appoint" : "Revoke"}
        variant={confirm?.action === "revoke" ? "destructive" : "default"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action === "grant" ? grantManager(confirm.user) : revokeManager(confirm!.user)}
      />
    </div>
  );
}
